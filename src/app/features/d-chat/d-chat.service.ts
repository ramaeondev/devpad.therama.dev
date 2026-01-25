import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { AuthStateService } from '../../core/services/auth-state.service';
import { DMessage, DConversation, DUserStatus, DChatUser } from '../../core/models/d-chat.model';
import { RealtimeChannel } from '@supabase/supabase-js';

@Injectable({ providedIn: 'root' })
export class DChatService {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthStateService);

  private readonly conversations = signal<DConversation[]>([]);
  private readonly userStatuses = signal<Map<string, DUserStatus>>(new Map());
  private readonly subscriptions = signal<Map<string, RealtimeChannel>>(new Map());
  private readonly currentConversationMessages = signal<DMessage[]>([]);
  private currentConversationId: string | null = null;

  // Public signals
  conversations$ = this.conversations.asReadonly();
  userStatuses$ = this.userStatuses.asReadonly();
  messages$ = this.currentConversationMessages.asReadonly();

  /**
   * Initialize chat service - load conversations and set up subscriptions
   */
  async initializeChat(): Promise<void> {
    const userId = this.auth.userId();
    if (!userId) throw new Error('User not authenticated');

    console.log('D-Chat initializing for user:', userId);

    // Set user online
    await this.setUserOnline(userId);

    // Load conversations
    await this.loadConversations(userId);

    // Load initial user statuses for conversation partners
    await this.loadConversationPartnerStatuses(userId);

    // Subscribe to new messages
    this.subscribeToMessages(userId);

    // Subscribe to user status changes
    this.subscribeToUserStatus();

    // Set up heartbeat to update last_seen
    this.setupHeartbeat(userId);
  }

  /**
   * Load all conversations for the current user
   */
  async loadConversations(userId: string): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('d_conversations')
        .select('*')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      this.conversations.set((data || []) as DConversation[]);
    } catch (error) {
      console.error('Error loading conversations:', error);
      throw error;
    }
  }

  /**
   * Load initial user statuses for all conversation partners
   */
  async loadConversationPartnerStatuses(userId: string): Promise<void> {
    try {
      const conversations = this.conversations();
      const partnerIds = conversations.map(conv => 
        conv.user1_id === userId ? conv.user2_id : conv.user1_id
      );

      if (partnerIds.length === 0) return;

      const { data, error } = await this.supabase
        .from('d_user_status')
        .select('*')
        .in('user_id', partnerIds);

      if (error) throw error;

      const statuses = this.userStatuses();
      const loadedCount = (data || []).length;
      (data || []).forEach(status => {
        statuses.set(status.user_id, status as DUserStatus);
        console.log(`✓ Loaded status for ${status.user_id}: ${status.is_online ? 'ONLINE' : 'OFFLINE'}`);
      });
      
      // Initialize missing partner statuses as offline
      partnerIds.forEach(partnerId => {
        if (!statuses.has(partnerId)) {
          statuses.set(partnerId, {
            user_id: partnerId,
            is_online: false,
            last_seen: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          console.log(`✓ Initialized ${partnerId} as OFFLINE (no status record)`);
        }
      });
      
      this.userStatuses.set(new Map(statuses));
      console.log(`✓ Loaded ${loadedCount} initial statuses for ${partnerIds.length} conversation partners`);
    } catch (error) {
      console.error('Error loading conversation partner statuses:', error);
    }
  }

  /**
   * Get or create a conversation with another user
   */
  async getOrCreateConversation(otherUserId: string): Promise<DConversation> {
    const userId = this.auth.userId();
    if (!userId) throw new Error('User not authenticated');

    try {
      // Check if conversation exists
      const { data: existing, error: selectError } = await this.supabase
        .from('d_conversations')
        .select('*')
        .or(`and(user1_id.eq.${userId},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${userId})`);

      if (selectError) throw selectError;

      if (existing && existing.length > 0) {
        return existing[0] as DConversation;
      }

      // Create new conversation (ensure user1_id < user2_id for constraint)
      const user1 = userId < otherUserId ? userId : otherUserId;
      const user2 = userId < otherUserId ? otherUserId : userId;

      const { data: newConversation, error: createError } = await this.supabase
        .from('d_conversations')
        .insert({
          user1_id: user1,
          user2_id: user2,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select();

      if (createError) throw createError;

      return (newConversation && newConversation.length > 0) 
        ? (newConversation[0] as DConversation)
        : ({ id: '', user1_id: user1, user2_id: user2 } as DConversation);
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

  /**
   * Send a message
   */
  async sendMessage(conversationId: string, recipientId: string, content: string): Promise<DMessage> {
    const userId = this.auth.userId();
    if (!userId) throw new Error('User not authenticated');

    try {
      const { data, error } = await this.supabase
        .from('d_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          recipient_id: recipientId,
          content: content.trim(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          read: false,
        })
        .select();

      if (error) throw error;

      // Update conversation last_message_at
      await this.supabase
        .from('d_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      return (data && data.length > 0) ? (data[0] as DMessage) : ({} as DMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(conversationId: string, limit: number = 50): Promise<DMessage[]> {
    try {
      const { data, error } = await this.supabase
        .from('d_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []) as DMessage[];
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }

  /**
   * Get messages between two users
   */
  async getMessagesBetweenUsers(otherUserId: string, limit: number = 50): Promise<DMessage[]> {
    const userId = this.auth.userId();
    if (!userId) throw new Error('User not authenticated');

    try {
      const { data, error } = await this.supabase
        .from('d_messages')
        .select('*')
        .or(
          `and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`
        )
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) throw error;

      return (data || []) as DMessage[];
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(recipientId: string): Promise<void> {
    const userId = this.auth.userId();
    if (!userId) throw new Error('User not authenticated');

    try {
      await this.supabase
        .from('d_messages')
        .update({ read: true })
        .eq('sender_id', recipientId)
        .eq('recipient_id', userId)
        .eq('read', false);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }

  async markConversationMessagesAsRead(conversationId: string): Promise<void> {
    const userId = this.auth.userId();
    if (!userId) throw new Error('User not authenticated');

    try {
      const { error } = await this.supabase
        .from('d_messages')
        .update({ read: true })
        .eq('conversation_id', conversationId)
        .eq('recipient_id', userId)
        .eq('read', false);

      if (error) throw error;
      console.log(`✓ Marked all messages as read in conversation ${conversationId}`);
    } catch (error) {
      console.error('Error marking conversation messages as read:', error);
    }
  }

  /**
   * Get unread message count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('d_messages')
        .select('*', { count: 'exact' })
        .eq('recipient_id', userId)
        .eq('read', false);

      if (error) throw error;

      return count || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  async getUnreadCountForConversation(userId: string, conversationId: string): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('d_messages')
        .select('*', { count: 'exact' })
        .eq('recipient_id', userId)
        .eq('conversation_id', conversationId)
        .eq('read', false);

      if (error) throw error;

      return count || 0;
    } catch (error) {
      console.error('Error getting unread count for conversation:', error);
      return 0;
    }
  }

  /**
   * Set user online status
   */
  async setUserOnline(userId: string): Promise<void> {
    try {
      const now = new Date().toISOString();

      // Use upsert to insert or update
      const { error } = await this.supabase
        .from('d_user_status')
        .upsert({
          user_id: userId,
          is_online: true,
          last_seen: now,
          updated_at: now,
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;
      console.log(`✓ User ${userId} marked online`);
    } catch (error) {
      console.error('Error setting user online:', error);
    }
  }

  /**
   * Set user offline status
   */
  async setUserOffline(userId: string): Promise<void> {
    try {
      await this.supabase
        .from('d_user_status')
        .update({
          is_online: false,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
    } catch (error) {
      console.error('Error setting user offline:', error);
    }
  }

  /**
   * Get user status
   */
  async getUserStatus(userId: string): Promise<DUserStatus | null> {
    try {
      const { data, error } = await this.supabase
        .from('d_user_status')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      return (data && data.length > 0) ? (data[0] as DUserStatus) : null;
    } catch (error) {
      console.error('Error getting user status:', error);
      return null;
    }
  }

  /**
   * Subscribe to real-time messages
   */
  private subscribeToMessages(userId: string): void {
    console.log(`[D-Chat] Subscribing to messages for user ${userId}`);
    
    const channel = this.supabase.realtimeClient
      .channel(`messages:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'd_messages',
        },
        (payload) => {
          const message = payload.new as DMessage;
          // Trigger reload for both sent and received messages
          if (message.sender_id === userId || message.recipient_id === userId) {
            this.loadConversations(userId).catch(err =>
              console.error('Error reloading conversations:', err)
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'd_messages',
        },
        (payload) => {
          const message = payload.new as DMessage;
          // Update message in current messages if it's for current conversation
          const messages = this.currentConversationMessages();
          const index = messages.findIndex(m => m.id === message.id);
          if (index !== -1) {
            messages[index] = message;
            this.currentConversationMessages.set([...messages]);
            console.log(`✓ Message ${message.id} marked as read`);
          }
        }
      )
      .subscribe((status, err) => {
        console.log(`[D-Chat] Messages channel status: ${status}`, err || '');
        if (status === 'SUBSCRIBED') {
          console.log(`✓ Subscribed to messages for user ${userId}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`✗ Subscription error for messages channel:`, err);
        }
      });

    const subs = this.subscriptions();
    subs.set(`messages:${userId}`, channel);
    this.subscriptions.set(subs);
  }

  /**
   * Subscribe to user status changes
   */
  private subscribeToUserStatus(): void {
    console.log('[D-Chat] Subscribing to user status changes');
    
    const channel = this.supabase.realtimeClient
      .channel('user_status')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'd_user_status',
        },
        (payload) => {
          const status = payload.new as DUserStatus;
          const statuses = this.userStatuses();
          statuses.set(status.user_id, status);
          this.userStatuses.set(new Map(statuses));
          console.log(`✓ User status updated: ${status.user_id} is ${status.is_online ? 'online' : 'offline'}`);
        }
      )
      .subscribe((status, err) => {
        console.log(`[D-Chat] User status channel status: ${status}`, err || '');
        if (status === 'SUBSCRIBED') {
          console.log(`✓ Subscribed to user status changes`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`✗ Subscription error for user status channel:`, err);
        }
      });

    const subs = this.subscriptions();
    subs.set('user_status', channel);
    this.subscriptions.set(subs);
  }

  /**
   * Setup heartbeat to keep user online status updated
   */
  private setupHeartbeat(userId: string): void {
    const interval = setInterval(() => {
      this.setUserOnline(userId).catch(err =>
        console.error('Heartbeat error:', err)
      );
    }, 30000); // Update every 30 seconds

    // Store interval for cleanup
    const subs = this.subscriptions();
    subs.set(`heartbeat:${userId}`, interval as any);
    this.subscriptions.set(subs);
  }

  /**
   * Get user by ID with profile info
   */
  async getUserById(userId: string): Promise<DChatUser | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      if (!data || data.length === 0) return null;
      const profile = data[0];

      const status = await this.getUserStatus(userId);

      return {
        id: userId,
        email: profile.email || '',
        first_name: profile.first_name,
        last_name: profile.last_name,
        avatar_url: profile.avatar_url,
        is_online: status?.is_online || false,
        last_seen: status?.last_seen,
      } as DChatUser;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }

  /**
   * Search users by email only (for privacy)
   */
  async searchUsers(query: string): Promise<DChatUser[]> {
    const userId = this.auth.userId();
    if (!userId) return [];

    try {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('*')
        .ilike('email', `%${query}%`)
        .neq('user_id', userId)
        .limit(10);

      if (error) throw error;

      const users: DChatUser[] = [];

      for (const profile of data || []) {
        const status = await this.getUserStatus(profile.user_id);
        users.push({
          id: profile.user_id,
          email: profile.email || '',
          first_name: profile.first_name,
          last_name: profile.last_name,
          avatar_url: profile.avatar_url,
          is_online: status?.is_online || false,
          last_seen: status?.last_seen,
        });
      }

      return users;
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }


  /**
   * Subscribe to messages for a specific conversation
   */
  subscribeToConversationMessages(conversationId: string): void {
    console.log(`[D-Chat] Subscribing to messages for conversation ${conversationId}`);
    
    this.currentConversationId = conversationId;
    
    // Unsubscribe from previous conversation if any
    const subs = this.subscriptions();
    const oldChannel = subs.get(`conversation:${this.currentConversationId}`);
    if (oldChannel) {
      (oldChannel as any).unsubscribe?.();
      subs.delete(`conversation:${this.currentConversationId}`);
    }

    const channel = this.supabase.realtimeClient
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'd_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const message = payload.new as DMessage;
          // Add new message to current conversation
          this.currentConversationMessages.set([
            ...this.currentConversationMessages(),
            message,
          ]);
          console.log(`✓ New message received in conversation ${conversationId}`);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'd_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const message = payload.new as DMessage;
          // Update message in current conversation (for read status)
          const messages = this.currentConversationMessages();
          const index = messages.findIndex(m => m.id === message.id);
          if (index !== -1) {
            messages[index] = message;
            this.currentConversationMessages.set([...messages]);
            console.log(`✓ Message ${message.id} updated (read status)`);
          }
        }
      )
      .subscribe((status, err) => {
        console.log(`[D-Chat] Conversation channel status: ${status}`, err || '');
        if (status === 'SUBSCRIBED') {
          console.log(`✓ Subscribed to messages for conversation ${conversationId}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`✗ Subscription error for conversation ${conversationId}:`, err);
        }
      });

    subs.set(`conversation:${conversationId}`, channel);
    this.subscriptions.set(subs);
  }

  /**
   * Update current conversation messages
   */
  setConversationMessages(messages: DMessage[]): void {
    this.currentConversationMessages.set(messages);
  }

  /**
   * Clean up subscriptions when component is destroyed
   */
  cleanup(userId: string): void {
    const subs = this.subscriptions();

    // Unsubscribe from channels
    subs.forEach((sub) => {
      if (sub && typeof (sub as any).unsubscribe === 'function') {
        (sub as any).unsubscribe();
      } else {
        clearInterval(sub as any);
      }
    });

    // Clear subscriptions
    subs.clear();
    this.subscriptions.set(subs);

    // Set user offline
    this.setUserOffline(userId).catch(err =>
      console.error('Error setting offline:', err)
    );
  }
}
