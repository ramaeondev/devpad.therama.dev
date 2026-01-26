/**
 * D-Chat Models
 * Models for one-to-one messaging system powered by Supabase
 */

export interface DMessageAttachment {
  id: string;
  message_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  created_at: string;
}

export interface DMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  read: boolean;
  attachments?: DMessageAttachment[];
  conversation_id?: string;
  status?: 'sending' | 'sent' | 'error'; // For optimistic updates
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
