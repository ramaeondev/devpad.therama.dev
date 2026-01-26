import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { AuthStateService } from '../../core/services/auth-state.service';
import { DMessage, DConversation, DUserStatus, DChatUser, DMessageAttachment } from '../../core/models/d-chat.model';
import { FileMetadata } from './models/file-attachment.model';
import { RealtimeChannel } from '@supabase/supabase-js';

@Injectable({ providedIn: 'root' })
export class DChatService {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthStateService);

  private readonly conversations = signal<DConversation[]>([]);
  private readonly userStatuses = signal<Map<string, DUserStatus>>(new Map());
  private readonly subscriptions = signal<Map<string, RealtimeChannel>>(new Map());
  readonly currentConversationMessages = signal<DMessage[]>([]);
  private currentConversationId: string | null = null;
  
  // Pagination state
  private readonly messagePageOffset = signal<number>(0);
  private readonly messagePageSize = signal<number>(100);
  private readonly hasMoreMessages = signal<boolean>(true);

  // Public signals
  conversations$ = this.conversations.asReadonly();
  userStatuses$ = this.userStatuses.asReadonly();
  messages$ = this.currentConversationMessages.asReadonly();
  hasMoreMessages$ = this.hasMoreMessages.asReadonly();

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
        : ({
            id: '',
            user1_id: user1,
            user2_id: user2,
            last_message: null,
            last_message_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as DConversation);
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
   * Get messages between two users with pagination support
   * @param otherUserId The ID of the other user
   * @param limit Number of messages to fetch per page (default: 100)
   * @param offset Offset for pagination (default: 0 for initial load)
   */
  async getMessagesBetweenUsers(otherUserId: string, limit: number = 100, offset: number = 0): Promise<DMessage[]> {
    const userId = this.auth.userId();
    if (!userId) throw new Error('User not authenticated');

    try {
      // Fetch messages with pagination
      const { data, error } = await this.supabase
        .from('d_messages')
        .select('*')
        .or(
          `and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`
        )
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const messages = (data || []) as DMessage[];

      // If no messages, return early
      if (messages.length === 0) {
        return messages;
      }

      // OPTIMIZATION: Fetch all attachments for all messages in ONE query
      const messageIds = messages.map(m => m.id);
      const { data: attachmentsData, error: attachmentsError } = await this.supabase
        .from('d_message_attachments')
        .select('*')
        .in('message_id', messageIds);

      if (attachmentsError) {
        console.error('Error fetching attachments:', attachmentsError);
        // If attachments fail, still return messages without attachments
        return messages.map(m => ({ ...m, attachments: [] }));
      }

      // Create a map of message_id -> attachments for O(1) lookup
      const attachmentsByMessageId = new Map<string, DMessageAttachment[]>();
      (attachmentsData || []).forEach((att: any) => {
        if (!attachmentsByMessageId.has(att.message_id)) {
          attachmentsByMessageId.set(att.message_id, []);
        }
        attachmentsByMessageId.get(att.message_id)!.push(att);
      });

      // Attach attachments to each message
      const messagesWithAttachments = messages.map(msg => ({
        ...msg,
        attachments: attachmentsByMessageId.get(msg.id) || []
      }));

      // Reverse to get chronological order (oldest first)
      messagesWithAttachments.reverse();

      return messagesWithAttachments;
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }

  /**
   * Load more messages for pagination (load older messages)
   * Call this when user scrolls to the top of the message list
   */
  async loadMoreMessages(otherUserId: string): Promise<DMessage[]> {
    const newOffset = this.messagePageOffset() + this.messagePageSize();
    const messages = await this.getMessagesBetweenUsers(otherUserId, this.messagePageSize(), newOffset);
    
    if (messages.length < this.messagePageSize()) {
      // No more messages to load
      this.hasMoreMessages.set(false);
    }
    
    // Prepend new messages to the current list
    const currentMessages = this.currentConversationMessages();
    this.currentConversationMessages.set([...messages, ...currentMessages]);
    
    // Update offset
    this.messagePageOffset.set(newOffset);
    
    console.log(`✓ Loaded ${messages.length} more messages. Total offset: ${newOffset}`);
    return messages;
  }

  /**
   * Reset pagination state (call when selecting a new conversation)
   */
  resetPaginationState(): void {
    this.messagePageOffset.set(0);
    this.hasMoreMessages.set(true);
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
   * Delete a message by ID
   */
  async deleteMessage(messageId: string): Promise<void> {
    const userId = this.auth.userId();
    if (!userId) throw new Error('User not authenticated');

    try {
      // First verify the message belongs to the current user
      const { data: message, error: fetchError } = await this.supabase
        .from('d_messages')
        .select('*')
        .eq('id', messageId)
        .single();

      if (fetchError || !message) {
        throw new Error('Message not found');
      }

      if (message.sender_id !== userId) {
        throw new Error('You can only delete your own messages');
      }

      // Delete the message
      const { error: deleteError } = await this.supabase
        .from('d_messages')
        .delete()
        .eq('id', messageId);

      if (deleteError) throw deleteError;

      console.log(`✓ Message ${messageId} deleted successfully`);
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  /**
   * Update/Edit a message
   */
  async updateMessage(messageId: string, newContent: string): Promise<DMessage> {
    const userId = this.auth.userId();
    if (!userId) throw new Error('User not authenticated');

    try {
      // First verify the message belongs to the current user
      const { data: message, error: fetchError } = await this.supabase
        .from('d_messages')
        .select('*')
        .eq('id', messageId)
        .single();

      if (fetchError || !message) {
        throw new Error('Message not found');
      }

      if (message.sender_id !== userId) {
        throw new Error('You can only edit your own messages');
      }

      // Update the message
      const { data, error } = await this.supabase
        .from('d_messages')
        .update({
          content: newContent.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', messageId)
        .select();

      if (error) throw error;

      return (data && data.length > 0) ? (data[0] as DMessage) : ({} as DMessage);
    } catch (error) {
      console.error('Error updating message:', error);
      throw error;
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

      // Use upsert with onConflict to atomically insert or update
      // This avoids race conditions that can cause duplicate key errors
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
        async (payload) => {
          const message = payload.new as DMessage;
          // Load attachments for the new message with retry logic
          // to handle race condition where attachments haven't been created yet
          try {
            let attachments: DMessageAttachment[] = [];
            let retries = 0;
            const maxRetries = 3;
            
            while (retries < maxRetries) {
              try {
                attachments = await this.getMessageAttachments(message.id);
                if (attachments.length > 0 || retries === maxRetries - 1) {
                  // Exit if we found attachments or exhausted retries
                  break;
                }
                // If no attachments and not last retry, wait a bit and retry
                if (attachments.length === 0 && retries < maxRetries - 1) {
                  await new Promise(resolve => setTimeout(resolve, 100));
                }
              } catch (error) {
                if (retries < maxRetries - 1) {
                  await new Promise(resolve => setTimeout(resolve, 100));
                } else {
                  throw error;
                }
              }
              retries++;
            }
            message.attachments = attachments;
          } catch (error) {
            console.error('Error loading attachments for new message:', error);
            message.attachments = [];
          }
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
   * Upload file to Supabase storage
   */
  async uploadFile(
    file: File,
    conversationId: string,
    messageId: string
  ): Promise<{ path: string; url: string }> {
    const userId = this.auth.userId();
    if (!userId) throw new Error('User not authenticated');

    try {
      console.log(`[D-Chat] uploadFile() called for: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);
      
      // Create unique file path
      const fileExtension = file.name.split('.').pop() || '';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
      const storagePath = `d-chat/${conversationId}/${messageId}/${fileName}`;

      console.log(`[D-Chat] Uploading to Supabase Storage at path: ${storagePath}`);

      // Upload file to storage using correct Supabase API
      const { error } = await this.supabase.storage
        .from('chat-attachments')
        .upload(storagePath, file);

      if (error) {
        console.error(`[D-Chat] Upload error for ${file.name}:`, error);
        throw error;
      }

      console.log(`[D-Chat] File uploaded successfully to storage: ${storagePath}`);

      // Get public URL
      const { data: publicData } = this.supabase.storage
        .from('chat-attachments')
        .getPublicUrl(storagePath);

      const publicUrl = publicData?.publicUrl || '';
      console.log(`[D-Chat] Public URL generated: ${publicUrl}`);

      return {
        path: storagePath,
        url: publicUrl,
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  /**
   * Create message attachment record in database
   */
  async createAttachmentRecord(
    messageId: string,
    file: File,
    storagePath: string
  ): Promise<DMessageAttachment> {
    try {
      const { data, error } = await this.supabase
        .from('d_message_attachments')
        .insert({
          message_id: messageId,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          storage_path: storagePath,
          created_at: new Date().toISOString(),
        })
        .select();

      if (error) throw error;

      console.log(`✓ Attachment record created for message ${messageId}`);
      return (data && data.length > 0) 
        ? (data[0] as DMessageAttachment)
        : {} as DMessageAttachment;
    } catch (error) {
      console.error('Error creating attachment record:', error);
      throw error;
    }
  }

  /**
   * Extract file from attachment (handles both File and FileMetadata types)
   */
  private extractFileFromAttachment(attachment: File | FileMetadata): File {
    if (attachment instanceof File) {
      console.log(`[D-Chat] Attachment is File object:`, attachment.name);
      return attachment;
    }

    const meta = attachment as any;
    if (meta.file instanceof File) {
      console.log(`[D-Chat] Attachment has file property:`, meta.file.name);
      return meta.file;
    }

    console.error(`[D-Chat] FileMetadata without File object:`, meta);
    throw new Error('FileMetadata without File object - component must pass File objects');
  }

  /**
   * Process and upload a single attachment
   */
  private async uploadSingleAttachment(
    attachment: File | FileMetadata,
    conversationId: string,
    messageId: string
  ): Promise<DMessageAttachment | null> {
    try {
      const file = this.extractFileFromAttachment(attachment);
      console.log(`[D-Chat] Uploading file: ${file.name} (${file.size} bytes)`);

      const { path } = await this.uploadFile(file, conversationId, messageId);
      const attachmentRecord = await this.createAttachmentRecord(messageId, file, path);

      console.log(`[D-Chat] Successfully uploaded and recorded: ${file.name}`);
      return attachmentRecord;
    } catch (uploadError) {
      console.error(`Error uploading attachment ${(attachment as any).name}:`, uploadError);
      return null;
    }
  }

  /**
   * Process all attachments for a message
   */
  private async processAttachments(
    attachments: (File | FileMetadata)[],
    conversationId: string,
    messageId: string
  ): Promise<DMessageAttachment[]> {
    if (attachments.length === 0) return [];

    console.log(`[D-Chat] Processing ${attachments.length} attachments for message ${messageId}`);
    const uploadedAttachments: DMessageAttachment[] = [];

    for (const attachment of attachments) {
      const record = await this.uploadSingleAttachment(attachment, conversationId, messageId);
      if (record) uploadedAttachments.push(record);
    }

    console.log(`✓ Uploaded ${uploadedAttachments.length} attachments for message ${messageId}`);
    return uploadedAttachments;
  }

  /**
   * Create a message record in database
   */
  private async createMessage(
    conversationId: string,
    userId: string,
    recipientId: string,
    content: string
  ): Promise<DMessage> {
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

    const message = (data && data.length > 0) ? (data[0] as DMessage) : null;
    if (!message) throw new Error('Failed to create message');

    return message;
  }

  /**
   * Update conversation's last updated timestamp
   */
  private async updateConversationTimestamp(conversationId: string): Promise<void> {
    await this.supabase
      .from('d_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);
  }

  /**
   * Send message with attachments
   * Note: attachments parameter should contain File objects, not just FileMetadata
   */
  async sendMessageWithAttachments(
    conversationId: string,
    recipientId: string,
    content: string,
    attachments: (File | FileMetadata)[] = []
  ): Promise<DMessage> {
    const userId = this.auth.userId();
    if (!userId) throw new Error('User not authenticated');

    console.log(`[D-Chat] sendMessageWithAttachments called with ${attachments.length} attachments`, attachments);

    try {
      // Create message first
      const message = await this.createMessage(conversationId, userId, recipientId, content);

      // Process attachments if any
      if (attachments.length > 0) {
        const uploadedAttachments = await this.processAttachments(
          attachments,
          conversationId,
          message.id
        );
        message.attachments = uploadedAttachments;
      }

      // Update conversation timestamp
      await this.updateConversationTimestamp(conversationId);

      return message;
    } catch (error) {
      console.error('Error sending message with attachments:', error);
      throw error;
    }
  }

  /**
   * Get attachments for a message
   */
  async getMessageAttachments(messageId: string): Promise<DMessageAttachment[]> {
    try {
      const { data, error } = await this.supabase
        .from('d_message_attachments')
        .select('*')
        .eq('message_id', messageId);

      if (error) throw error;

      return (data || []) as DMessageAttachment[];
    } catch (error) {
      console.error('Error fetching message attachments:', error);
      return [];
    }
  }

  /**
   * Delete attachment
   */
  async deleteAttachment(attachmentId: string, storagePath: string): Promise<void> {
    const userId = this.auth.userId();
    if (!userId) throw new Error('User not authenticated');

    try {
      // Delete from storage using correct Supabase API
      await this.supabase.storage
        .from('chat-attachments')
        .remove([storagePath]);

      // Delete attachment record
      await this.supabase
        .from('d_message_attachments')
        .delete()
        .eq('id', attachmentId);

      // Update local message state - remove attachment from messages
      const messages = this.currentConversationMessages();
      const updatedMessages = messages.map(msg => {
        if (msg.attachments) {
          return {
            ...msg,
            attachments: msg.attachments.filter(a => a.id !== attachmentId)
          };
        }
        return msg;
      });
      this.currentConversationMessages.set(updatedMessages);

      console.log(`✓ Attachment deleted: ${attachmentId}`);
    } catch (error) {
      console.error('Error deleting attachment:', error);
      throw error;
    }
  }

  /**
   * Get public URL for attachment
   */
  getAttachmentUrl(storagePath: string): string {
    const { data } = this.supabase.storage
      .from('chat-attachments')
      .getPublicUrl(storagePath);
    return data?.publicUrl || '';
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
