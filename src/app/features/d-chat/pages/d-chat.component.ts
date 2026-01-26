import { Component, OnInit, OnDestroy, inject, signal, computed, ViewChild, ElementRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DChatService } from '../d-chat.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { DChatUser, DConversation, DMessage } from '../../../core/models/d-chat.model';
import { FileMetadata } from '../models/file-attachment.model';
import { ToastService } from '../../../core/services/toast.service';
import { ChatMessageComponent } from '../components/chat-message/chat-message.component';
import { ConversationItemComponent } from '../components/conversation-list/conversation-list.component';
import { UserSearchComponent } from '../components/user-search/user-search.component';
import { RichTextareaComponent } from '../components/rich-textarea/rich-textarea.component';

@Component({
  selector: 'app-d-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ChatMessageComponent,
    ConversationItemComponent,
    UserSearchComponent,
    RichTextareaComponent,
  ],
  templateUrl: './d-chat.component.html',
  styleUrls: ['./d-chat.component.scss'],
})
export class DChatComponent implements OnInit, OnDestroy {
  private readonly dChatService = inject(DChatService);
  private readonly auth = inject(AuthStateService);
  private readonly toast = inject(ToastService);

  // UI State
  selectedConversationId = signal<string | null>(null);
  selectedUser = signal<DChatUser | null>(null);
  messageInput = signal<string>('');
  attachments = signal<FileMetadata[]>([]);
  loading = signal<boolean>(false);
  sendingMessage = signal<boolean>(false);
  showUserSearch = signal<boolean>(false);
  isMobileOpen = signal<boolean>(false);
  replyingTo = signal<DMessage | null>(null);
  editingMessage = signal<DMessage | null>(null);

  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLDivElement>;
  @ViewChild(RichTextareaComponent) richTextarea!: RichTextareaComponent;

  // Auto-scroll effect when messages change
  constructor() {
    effect(() => {
      // Watch messages signal
      this.messages();
      // Auto-scroll to bottom after messages update
      this.scrollToBottom();
    });
  }

  // Computed signals
  conversations = this.dChatService.conversations$;
  messages = this.dChatService.messages$;
  userStatuses = this.dChatService.userStatuses$;
  hasMoreMessages = this.dChatService.hasMoreMessages$;
  currentUserId = this.auth.userId;

  selectedConversation = computed(() => {
    const id = this.selectedConversationId();
    if (!id) return null;
    return this.conversations().find((c) => c.id === id) || null;
  });

  otherUserId = computed(() => {
    const conv = this.selectedConversation();
    if (!conv) return null;
    const userId = this.currentUserId();
    return conv.user1_id === userId ? conv.user2_id : conv.user1_id;
  });

  hasUnreadMessages = computed(() => {
    return this.messages().some(
      (m) => m.recipient_id === this.currentUserId() && !m.read
    );
  });

  ngOnInit(): void {
    this.loadChat();
  }

  /**
   * Auto-scroll to bottom of messages container
   */
  private scrollToBottom(): void {
    // Use setTimeout to ensure DOM has updated
    setTimeout(() => {
      if (this.messagesContainer?.nativeElement) {
        const container = this.messagesContainer.nativeElement;
        container.scrollTop = container.scrollHeight;
      }
    }, 0);
  }

  private async loadChat(): Promise<void> {
    try {
      this.loading.set(true);
      await this.dChatService.initializeChat();

      // Load first conversation if available
      const conversations = this.conversations();
      if (conversations.length > 0) {
        await this.selectConversation(conversations[0]);
      }
    } catch (error) {
      console.error('Failed to initialize chat:', error);
      this.toast.error('Failed to load chat');
    } finally {
      this.loading.set(false);
    }
  }

  async selectConversation(conversation: DConversation): Promise<void> {
    try {
      this.selectedConversationId.set(conversation.id);
      const otherUserId = this.otherUserId();

      if (!otherUserId) return;

      // Reset pagination state for new conversation
      this.dChatService.resetPaginationState();

      // Load messages (first page - 100 messages)
      this.loading.set(true);
      const msgs = await this.dChatService.getMessagesBetweenUsers(
        otherUserId,
        100,
        0
      );
      this.dChatService.setConversationMessages(msgs);

      // Subscribe to real-time messages for this conversation
      this.dChatService.subscribeToConversationMessages(conversation.id);

      // Mark as read for this conversation
      await this.dChatService.markConversationMessagesAsRead(conversation.id);

      // Load other user profile
      const user = await this.dChatService.getUserById(otherUserId);
      this.selectedUser.set(user);

      // Close mobile sidebar
      this.isMobileOpen.set(false);

      // Scroll to bottom when conversation is selected
      this.scrollToBottom();
    } catch (error) {
      console.error('Error selecting conversation:', error);
      this.toast.error('Failed to load conversation');
    } finally {
      this.loading.set(false);
    }
  }

  async startNewConversation(user: DChatUser): Promise<void> {
    try {
      this.loading.set(true);
      const conversation = await this.dChatService.getOrCreateConversation(
        user.id
      );
      await this.selectConversation(conversation);
      this.showUserSearch.set(false);
    } catch (error) {
      console.error('Error starting conversation:', error);
      this.toast.error('Failed to start conversation');
    } finally {
      this.loading.set(false);
    }
  }

  async sendMessage(attachmentData?: FileMetadata[]): Promise<void> {
    const content = this.messageInput().trim();
    const files = attachmentData || this.attachments();
    
    // Allow sending with files even if content is empty
    if (!content && files.length === 0) return;

    // Check if we're editing a message
    const editingMsg = this.editingMessage();
    if (editingMsg) {
      try {
        this.sendingMessage.set(true);
        
        // Update the message
        await this.dChatService.updateMessage(editingMsg.id, content);
        
        // Update local messages array
        const currentMessages = this.dChatService.currentConversationMessages();
        const updatedMessages = currentMessages.map(m => 
          m.id === editingMsg.id ? { ...m, content } : m
        );
        this.dChatService.currentConversationMessages.set(updatedMessages);
        
        // Reset editing state
        this.editingMessage.set(null);
        this.messageInput.set('');
        this.attachments.set([]);
        
        if (this.richTextarea) {
          this.richTextarea.reset();
        }
        
        this.toast.success('Message updated');
      } catch (error) {
        console.error('Error updating message:', error);
        this.toast.error('Failed to update message');
      } finally {
        this.sendingMessage.set(false);
      }
      return;
    }

    const conversationId = this.selectedConversationId();
    const recipientId = this.otherUserId();

    if (!conversationId || !recipientId) {
      this.toast.error('No conversation selected');
      return;
    }

    try {
      this.sendingMessage.set(true);
      
      // Create optimistic message - appears immediately
      const optimisticMessage: DMessage = {
        id: `temp-${Date.now()}`, // Temporary ID
        conversation_id: conversationId,
        sender_id: this.currentUserId()!,
        recipient_id: recipientId,
        content: content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        read: false,
        status: 'sending', // Custom status for UI
        attachments: [] // Will be added after real send
      };

      // Add optimistic message to UI immediately
      const currentMessages = this.messages();
      this.dChatService.currentConversationMessages.set([...currentMessages, optimisticMessage]);

      // Clear input immediately for better UX
      this.messageInput.set('');
      this.attachments.set([]);

      // Reset the rich textarea component (clears files, text, formatting)
      if (this.richTextarea) {
        this.richTextarea.reset();
      }

      // Send message to server
      const sentMessage = await this.dChatService.sendMessageWithAttachments(
        conversationId,
        recipientId,
        content,
        files
      );

      // Replace optimistic message with real one
      const updatedMessages = this.messages().map((m) =>
        m.id === optimisticMessage.id ? sentMessage : m
      );
      this.dChatService.currentConversationMessages.set(updatedMessages);
      
      // Note: The real-time subscription will also receive the INSERT event
      // but our map above ensures we don't duplicate since we already replaced it

      // Return focus to input for continuous typing (use setTimeout to ensure DOM is ready)
      setTimeout(() => {
        if (this.richTextarea) {
          this.richTextarea.focus();
        }
      }, 50);
    } catch (error) {
      console.error('Error sending message:', error);
      this.toast.error('Failed to send message');
      
      // Remove optimistic message on error
      const updatedMessages = this.messages().filter(
        (m) => m.id !== `temp-${Date.now()}` && !m.id.startsWith('temp-')
      );
      this.dChatService.currentConversationMessages.set(updatedMessages);
      
      // Restore input on error
      this.messageInput.set(content);
      this.attachments.set(files);
    } finally {
      this.sendingMessage.set(false);
      
      // Ensure focus is set after all state updates complete
      setTimeout(() => {
        if (this.richTextarea) {
          this.richTextarea.focus();
        }
      }, 100);
    }
  }

  onFileAttachmentsSelected(files: FileMetadata[]): void {
    this.attachments.set(files);
  }

  /**
   * Delete attachment from message
   */
  async deleteAttachment(attachmentId: string, messageId: string): Promise<void> {
    try {
      // Find the attachment in the current message
      const currentMessage = this.messages().find(m => m.id === messageId);
      if (!currentMessage || !currentMessage.attachments) return;

      const attachment = currentMessage.attachments.find(a => a.id === attachmentId);
      if (!attachment) return;

      // Delete from service (storage + database + local state)
      await this.dChatService.deleteAttachment(attachmentId, attachment.storage_path);
      this.toast.success('Attachment deleted successfully');
    } catch (error) {
      console.error('Error deleting attachment:', error);
      this.toast.error('Failed to delete attachment');
    }
  }

  toggleUserSearch(): void {
    console.log('Toggle user search - current state:', this.showUserSearch());
    this.showUserSearch.update((v) => {
      const newVal = !v;
      console.log('User search toggled to:', newVal);
      return newVal;
    });
  }

  /**
   * Load more messages for pagination
   * Call when user scrolls to top of message list
   */
  async loadMoreMessages(): Promise<void> {
    const otherUserId = this.otherUserId();
    if (!otherUserId || !this.hasMoreMessages()) return;

    try {
      this.loading.set(true);
      await this.dChatService.loadMoreMessages(otherUserId);
    } catch (error) {
      console.error('Error loading more messages:', error);
      this.toast.error('Failed to load more messages');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Handle scroll event in messages container
   * Load more messages when user scrolls near the top
   */
  onMessagesScroll(event: Event): void {
    const container = event.target as HTMLDivElement;
    // Load more when user scrolls within 200px of the top
    if (container.scrollTop < 200 && this.hasMoreMessages() && !this.loading()) {
      this.loadMoreMessages();
    }
  }

  toggleMobileSidebar(): void {
    this.isMobileOpen.update((v) => !v);
  }

  closeMobileSidebar(): void {
    this.isMobileOpen.set(false);
  }

  handleKeyDown(event: KeyboardEvent): void {
    // Enter sends message, Shift+Enter creates new line
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
    // Shift+Enter allows default behavior (new line)
  }

  onMessageInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.messageInput.set(target.value);
  }

  isUserOnline(userId: string): boolean {
    const status = this.userStatuses().get(userId);
    return status?.is_online || false;
  }

  /**
   * Handle reply to message action
   */
  handleReplyToMessage(message: DMessage): void {
    this.replyingTo.set(message);
    // Focus the text input
    setTimeout(() => {
      if (this.richTextarea) {
        this.richTextarea.focus();
      }
    }, 0);
    this.toast.success(`Replying to ${message.sender_id === this.currentUserId() ? 'your' : 'their'} message`);
  }

  /**
   * Handle forward message action
   */
  handleForwardMessage(message: DMessage): void {
    // Set the message content in the input with a forward prefix
    const forwardedContent = `[FORWARDED]\n${message.content}`;
    this.messageInput.set(forwardedContent);
    setTimeout(() => {
      if (this.richTextarea) {
        this.richTextarea.focus();
      }
    }, 0);
    this.toast.success('Message forwarded to input');
  }

  /**
   * Handle edit message action
   */
  handleEditMessage(message: DMessage): void {
    if (!message.id) return;
    
    // Only allow editing own messages
    if (message.sender_id !== this.currentUserId()) {
      this.toast.error('You can only edit your own messages');
      return;
    }

    this.editingMessage.set(message);
    this.messageInput.set(message.content);
    setTimeout(() => {
      if (this.richTextarea) {
        this.richTextarea.focus();
      }
    }, 0);
    this.toast.info('Editing message - send to update');
  }

  /**
   * Cancel editing current message
   */
  cancelEditingMessage(): void {
    this.editingMessage.set(null);
    this.messageInput.set('');
  }

  /**
   * Handle delete message action
   */
  async handleDeleteMessage(message: DMessage): Promise<void> {
    if (!message.id) return;

    // Only allow deleting own messages
    if (message.sender_id !== this.currentUserId()) {
      this.toast.error('You can only delete your own messages');
      return;
    }

    try {
      this.sendingMessage.set(true);
      await this.dChatService.deleteMessage(message.id);
      
      // Remove from local messages array
      const currentMessages = this.dChatService.currentConversationMessages();
      const updatedMessages = currentMessages.filter(m => m.id !== message.id);
      this.dChatService.currentConversationMessages.set(updatedMessages);
      
      this.toast.success('Message deleted');
    } catch (error) {
      console.error('Error deleting message:', error);
      this.toast.error('Failed to delete message');
    } finally {
      this.sendingMessage.set(false);
    }
  }

  /**
   * Handle pin message action
   */
  async handlePinMessage(_message: DMessage): Promise<void> {
    // TODO: Implement pin functionality when backend supports it
    this.toast.info('Pin functionality coming soon');
  }

  /**
   * Handle generic message action
   */
  handleMessageAction(event: { action: any; message: DMessage }): void {
    console.log('Message action triggered:', event.action, event.message.id);
  }

  ngOnDestroy(): void {
    const userId = this.auth.userId();
    if (userId) {
      this.dChatService.cleanup(userId);
    }
  }
}
