import { Component, OnInit, OnDestroy, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DChatService, ChatMessage, ChatUser } from '../services/d-chat.service';
import { AuthStateService } from '../../../core/services/auth-state.service';

@Component({
  selector: 'app-d-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './d-chat.component.html',
  styleUrls: ['./d-chat.component.scss'],
})
export class DChatComponent implements OnInit, OnDestroy {
  private chatService = inject(DChatService);
  private authState = inject(AuthStateService);

  users = signal<ChatUser[]>([]);
  messages = signal<ChatMessage[]>([]);
  selectedUser = signal<ChatUser | null>(null);
  newMessage = signal<string>('');
  loading = signal<boolean>(false);
  currentUserId = this.authState.userId();

  constructor() {
    // Subscribe to messages
    effect(() => {
      this.chatService.messages$.subscribe((messages) => {
        this.messages.set(messages);
      });
    });

    // Subscribe to users
    effect(() => {
      this.chatService.users$.subscribe((users) => {
        this.users.set(users);
      });
    });
  }

  async ngOnInit() {
    this.loading.set(true);
    await this.loadUsers();
    this.loading.set(false);
  }

  ngOnDestroy() {
    this.chatService.unsubscribe();
  }

  async loadUsers() {
    await this.chatService.getUsers();
  }

  async selectUser(user: ChatUser) {
    this.selectedUser.set(user);
    this.loading.set(true);
    await this.chatService.getMessages(user.id);
    this.loading.set(false);

    // Mark messages as read
    const unreadMessages = this.messages()
      .filter((msg) => msg.sender_id === user.id && !msg.read)
      .map((msg) => msg.id);

    if (unreadMessages.length > 0) {
      await this.chatService.markAsRead(unreadMessages);
    }

    // Scroll to bottom
    setTimeout(() => this.scrollToBottom(), 100);
  }

  async sendMessage() {
    const message = this.newMessage().trim();
    const user = this.selectedUser();

    if (!message || !user) return;

    await this.chatService.sendMessage(user.id, message);
    this.newMessage.set('');

    // Scroll to bottom
    setTimeout(() => this.scrollToBottom(), 100);
  }

  private scrollToBottom() {
    const messagesContainer = document.querySelector('.messages-container');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  getUserDisplayName(user: ChatUser | null): string {
    if (!user) return '';
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return user.email;
  }

  getInitials(user: ChatUser): string {
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    if (user.first_name) {
      return user.first_name.slice(0, 2).toUpperCase();
    }
    return user.email[0].toUpperCase();
  }

  isMessageFromCurrentUser(message: ChatMessage): boolean {
    return message.sender_id === this.currentUserId;
  }

  formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
}
