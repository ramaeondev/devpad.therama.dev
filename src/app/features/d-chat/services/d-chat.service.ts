import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { BehaviorSubject } from 'rxjs';

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
  read: boolean;
  sender_name?: string;
}

export interface ChatUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
}

@Injectable({
  providedIn: 'root',
})
export class DChatService {
  private supabase = inject(SupabaseService);
  private authState = inject(AuthStateService);

  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  public messages$ = this.messagesSubject.asObservable();

  private usersSubject = new BehaviorSubject<ChatUser[]>([]);
  public users$ = this.usersSubject.asObservable();

  private chatChannel: any = null;

  constructor() {
    // Subscribe to real-time updates
    this.subscribeToMessages();
  }

  /**
   * Get list of users to chat with
   */
  async getUsers(): Promise<ChatUser[]> {
    const currentUserId = this.authState.userId();
    if (!currentUserId) return [];

    try {
      const { data, error } = await this.supabase.client
        .from('profiles')
        .select('id, email, first_name, last_name, avatar_url')
        .neq('id', currentUserId)
        .limit(50);

      if (error) throw error;

      const users = (data || []) as ChatUser[];
      this.usersSubject.next(users);
      return users;
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }

  /**
   * Get messages between current user and another user
   */
  async getMessages(otherUserId: string): Promise<ChatMessage[]> {
    const currentUserId = this.authState.userId();
    if (!currentUserId) return [];

    try {
      const { data, error } = await this.supabase.client
        .from('chat_messages')
        .select('*')
        .or(
          `and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`,
        )
        .order('created_at', { ascending: true });

      if (error) throw error;

      const messages = (data || []) as ChatMessage[];
      this.messagesSubject.next(messages);
      return messages;
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  /**
   * Send a message to another user
   */
  async sendMessage(receiverId: string, message: string): Promise<ChatMessage | null> {
    const currentUserId = this.authState.userId();
    if (!currentUserId) return null;

    try {
      const { data, error } = await this.supabase.client
        .from('chat_messages')
        .insert({
          sender_id: currentUserId,
          receiver_id: receiverId,
          message: message,
          read: false,
        })
        .select()
        .single();

      if (error) throw error;

      return data as ChatMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    }
  }

  /**
   * Mark messages as read
   */
  async markAsRead(messageIds: string[]): Promise<void> {
    try {
      const { error } = await this.supabase.client
        .from('chat_messages')
        .update({ read: true })
        .in('id', messageIds);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }

  /**
   * Subscribe to real-time message updates
   */
  private subscribeToMessages(): void {
    const currentUserId = this.authState.userId();
    if (!currentUserId) return;

    this.chatChannel = this.supabase.client
      .channel('chat_messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `or(sender_id=eq.${currentUserId},receiver_id=eq.${currentUserId})`,
        },
        (payload) => {
          // Handle real-time message updates
          const currentMessages = this.messagesSubject.value;
          if (payload.eventType === 'INSERT') {
            this.messagesSubject.next([...currentMessages, payload.new as ChatMessage]);
          } else if (payload.eventType === 'UPDATE') {
            const updated = currentMessages.map((msg) =>
              msg.id === (payload.new as any)['id'] ? (payload.new as ChatMessage) : msg,
            );
            this.messagesSubject.next(updated);
          } else if (payload.eventType === 'DELETE') {
            const filtered = currentMessages.filter((msg) => msg.id !== (payload.old as any)['id']);
            this.messagesSubject.next(filtered);
          }
        },
      )
      .subscribe();
  }

  /**
   * Clean up subscriptions
   */
  unsubscribe(): void {
    if (this.chatChannel) {
      this.supabase.client.removeChannel(this.chatChannel);
      this.chatChannel = null;
    }
  }
}
