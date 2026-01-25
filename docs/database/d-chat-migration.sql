-- D-Chat Feature: Chat Messages Table
-- This migration creates the chat_messages table for the D-Chat feature

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON public.chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver_id ON public.chat_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
-- Users can view messages where they are either sender or receiver
CREATE POLICY "Users can view their own messages"
    ON public.chat_messages
    FOR SELECT
    USING (
        auth.uid() = sender_id OR auth.uid() = receiver_id
    );

-- Users can insert messages where they are the sender
CREATE POLICY "Users can send messages"
    ON public.chat_messages
    FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id
    );

-- Users can update messages where they are the receiver (for marking as read)
CREATE POLICY "Users can update received messages"
    ON public.chat_messages
    FOR UPDATE
    USING (
        auth.uid() = receiver_id
    )
    WITH CHECK (
        auth.uid() = receiver_id
    );

-- Users can delete messages where they are the sender
CREATE POLICY "Users can delete sent messages"
    ON public.chat_messages
    FOR DELETE
    USING (
        auth.uid() = sender_id
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_chat_messages_updated_at
    BEFORE UPDATE ON public.chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

COMMENT ON TABLE public.chat_messages IS 'Stores one-to-one chat messages between users';
COMMENT ON COLUMN public.chat_messages.sender_id IS 'User ID of the message sender';
COMMENT ON COLUMN public.chat_messages.receiver_id IS 'User ID of the message receiver';
COMMENT ON COLUMN public.chat_messages.message IS 'Message content';
COMMENT ON COLUMN public.chat_messages.read IS 'Whether the message has been read by the receiver';
