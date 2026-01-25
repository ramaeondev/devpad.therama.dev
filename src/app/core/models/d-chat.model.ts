/**
 * D-Chat Models
 * Models for one-to-one messaging system powered by Supabase
 */

export interface DMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  read: boolean;
}

export interface DConversation {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message: DMessage | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DUserStatus {
  user_id: string;
  is_online: boolean;
  last_seen: string;
  updated_at: string;
}

export interface DChatUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  is_online?: boolean;
  last_seen?: string;
}

export interface DMessageThread {
  conversationId: string;
  otherUser: DChatUser;
  messages: DMessage[];
  unreadCount: number;
}
