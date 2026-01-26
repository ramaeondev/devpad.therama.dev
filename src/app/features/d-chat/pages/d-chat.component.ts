import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DChatService } from '../d-chat.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { DChatUser, DConversation } from '../../../core/models/d-chat.model';
import { ToastService } from '../../../core/services/toast.service';
import { ChatMessageComponent } from '../components/chat-message/chat-message.component';
import { ConversationItemComponent } from '../components/conversation-list/conversation-list.component';
import { UserSearchComponent } from '../components/user-search/user-search.component';

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
  loading = signal<boolean>(false);
  showUserSearch = signal<boolean>(false);
  isMobileOpen = signal<boolean>(false);

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

  async sendMessage(): Promise<void> {
    const content = this.messageInput().trim();
    if (!content) return;

    const conversationId = this.selectedConversationId();
    const recipientId = this.otherUserId();

    if (!conversationId || !recipientId) {
      this.toast.error('No conversation selected');
      return;
    }

    try {
      this.messageInput.set('');

      await this.dChatService.sendMessage(
        conversationId,
        recipientId,
        content
      );

      // Let real-time subscription add the message - don't duplicate it here
      // Just scroll to bottom after a short delay to let realtime update arrive
      setTimeout(() => {
        const messagesContainer = document.querySelector(
          '.messages-container'
        );
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      this.toast.error('Failed to send message');
      // Restore input on error
      this.messageInput.set(content);
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
    if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault();
      this.sendMessage();
    }
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
