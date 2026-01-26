-- Create D-Chat tables for Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- D-Chat Conversations table
CREATE TABLE IF NOT EXISTS public.d_conversations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_id uuid REFERENCES public.d_messages(id),
  last_message_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT NOW(),
  updated_at timestamp with time zone NOT NULL DEFAULT NOW(),
  CONSTRAINT different_users CHECK (user1_id != user2_id),
  CONSTRAINT users_ordered CHECK (user1_id < user2_id)
);

-- D-Chat Messages table
CREATE TABLE IF NOT EXISTS public.d_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id uuid REFERENCES public.d_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT NOW(),
  updated_at timestamp with time zone NOT NULL DEFAULT NOW()
);

-- D-Chat User Status table
CREATE TABLE IF NOT EXISTS public.d_user_status (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_online boolean NOT NULL DEFAULT false,
  last_seen timestamp with time zone NOT NULL DEFAULT NOW(),
  updated_at timestamp with time zone NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_d_conversations_user1_id ON public.d_conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_d_conversations_user2_id ON public.d_conversations(user2_id);
CREATE INDEX IF NOT EXISTS idx_d_conversations_updated_at ON public.d_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_d_messages_sender_id ON public.d_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_d_messages_recipient_id ON public.d_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_d_messages_conversation_id ON public.d_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_d_messages_read ON public.d_messages(read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_d_messages_created_at ON public.d_messages(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.d_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.d_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.d_user_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies for d_conversations
-- Users can view conversations they're part of
CREATE POLICY "Users can view their own conversations"
  ON public.d_conversations
  FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Users can create conversations
CREATE POLICY "Users can create conversations"
  ON public.d_conversations
  FOR INSERT
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Users can update conversations they're part of
CREATE POLICY "Users can update their own conversations"
  ON public.d_conversations
  FOR UPDATE
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- RLS Policies for d_messages
-- Users can view messages in conversations they're part of
CREATE POLICY "Users can view conversation messages"
  ON public.d_messages
  FOR SELECT
  USING (
    auth.uid() = sender_id 
    OR auth.uid() = recipient_id
  );

-- Users can insert messages they're sending
CREATE POLICY "Users can send messages"
  ON public.d_messages
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Users can update their received messages (to mark as read)
CREATE POLICY "Users can update received messages"
  ON public.d_messages
  FOR UPDATE
  USING (auth.uid() = recipient_id);

-- RLS Policies for d_user_status
-- Users can view all user statuses
CREATE POLICY "Users can view user statuses"
  ON public.d_user_status
  FOR SELECT
  USING (true);

-- Users can insert their own status (for direct inserts)
CREATE POLICY "Users can insert their own status"
  ON public.d_user_status
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow all authenticated users to insert any status (for upsert operations)
-- This enables the setUserOnline/setUserOffline methods to work via upsert
CREATE POLICY "Authenticated users can insert status for upsert"
  ON public.d_user_status
  FOR INSERT
  WITH CHECK (true);

-- Users can update their own status
CREATE POLICY "Users can update their own status"
  ON public.d_user_status
  FOR UPDATE
  USING (auth.uid() = user_id);
