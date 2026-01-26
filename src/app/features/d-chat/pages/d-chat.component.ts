import { Component, OnInit, OnDestroy, inject, signal, computed, ViewChild, ElementRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DChatService } from '../d-chat.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { DChatUser, DConversation } from '../../../core/models/d-chat.model';
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

      // Load messages
      this.loading.set(true);
      const msgs = await this.dChatService.getMessagesBetweenUsers(
        otherUserId,
        100
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

    const conversationId = this.selectedConversationId();
    const recipientId = this.otherUserId();

    if (!conversationId || !recipientId) {
      this.toast.error('No conversation selected');
      return;
    }

    try {
      this.sendingMessage.set(true);
      this.messageInput.set('');
      this.attachments.set([]);

      // Send message and get it back with attachments
      const sentMessage = await this.dChatService.sendMessageWithAttachments(
        conversationId,
        recipientId,
        content,
        files
      );

      // Add the sent message with attachments immediately to avoid race condition
      // The real-time subscription will also add it, but this ensures attachments are visible
      const currentMessages = this.dChatService.currentConversationMessages();
      
      // Check if message already exists (from real-time)
      const messageExists = currentMessages.some(m => m.id === sentMessage.id);
      if (!messageExists) {
        // Add immediately with attachments included
        this.dChatService.currentConversationMessages.set([
          ...currentMessages,
          sentMessage
        ]);
      } else {
        // Update existing message with attachments if they weren't loaded
        const updatedMessages = currentMessages.map(m => 
          m.id === sentMessage.id 
            ? { ...m, attachments: sentMessage.attachments }
            : m
        );
        this.dChatService.currentConversationMessages.set(updatedMessages);
      }

      // Reset the rich textarea component (clears files, text, formatting)
      if (this.richTextarea) {
        this.richTextarea.reset();
      }

      // Let real-time subscription sync the message state
    } catch (error) {
      console.error('Error sending message:', error);
      this.toast.error('Failed to send message');
      // Restore input on error
      this.messageInput.set(content);
      this.attachments.set(files);
    } finally {
      this.sendingMessage.set(false);
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

  ngOnDestroy(): void {
    const userId = this.auth.userId();
    if (userId) {
      this.dChatService.cleanup(userId);
    }
  }
}
