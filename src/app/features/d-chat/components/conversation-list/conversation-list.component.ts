import { Component, Input, Output, EventEmitter, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DConversation, DUserStatus } from '../../../../core/models/d-chat.model';
import { DChatService } from '../../d-chat.service';

@Component({
  selector: 'app-conversation-item',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      (click)="onSelect()"
      class="conversation-item w-full text-left px-3 py-2 border-b border-retro-green/20 hover:bg-gray-800 hover:border-l-2 hover:border-retro-green transition-colors"
      [class.bg-gray-800]="isSelected"
      [class.border-l-2]="isSelected"
      [class.border-l-retro-green]="isSelected"
    >
      <div class="flex items-center gap-2">
        <!-- User Avatar -->
        <div class="relative flex-shrink-0">
          <div class="w-10 h-10 rounded bg-retro-green/20 border border-retro-green flex items-center justify-center">
            @if (otherUser()) {
            @if (otherUser()!.avatar_url) {
            <img
              [src]="otherUser()!.avatar_url"
              alt="{{ otherUser()!.first_name }}"
              class="w-full h-full rounded object-cover"
            />
            } @else {
            <span class="text-retro-green font-mono text-sm font-bold">
              {{ (otherUser()!.first_name || 'U')[0] | uppercase }}
            </span>
            }
            }
          </div>
          @if (isOnline()) {
          <div class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-retro-green rounded-full border border-black"></div>
          }
        </div>

        <!-- Message Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2">
            <div class="flex-1 min-w-0">
              <h3 class="text-sm font-mono font-bold text-retro-green truncate">
                {{ otherUser()?.first_name }} {{ otherUser()?.last_name }}
              </h3>
              <p class="text-xs text-gray-500 truncate">
                {{ otherUser()?.email }}
              </p>
            </div>
            @if (unreadCount() > 0) {
            <div class="flex-shrink-0 bg-retro-green text-black rounded-full w-5 h-5 flex items-center justify-center text-xs font-mono font-bold">
              {{ unreadCount() }}
            </div>
            }
          </div>
          <p class="text-xs text-gray-400 truncate mt-1">
            @if (conversation.last_message) {
            {{ conversation.last_message.content }}
            } @else {
            NO MESSAGES
            }
          </p>
        </div>

        <!-- Online Status Indicator -->
        @if (isOnline()) {
        <div class="flex-shrink-0">
          <span class="text-xs text-retro-green font-mono">●</span>
        </div>
        }
      </div>
    </button>
  `,
  styles: [`
    .conversation-item {
      animation: fade-in 0.3s ease-in;
    }

    @keyframes fade-in {
      from {
        opacity: 0;
        transform: translateX(-10px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
  `],
})
export class ConversationItemComponent {
  @Input() conversation!: DConversation;
  @Input() isSelected: boolean = false;
  @Input() userStatuses!: Map<string, DUserStatus>;
  @Input() currentUserId!: string;
  @Output() selectConversation = new EventEmitter<void>();

  private readonly dChatService = inject(DChatService);
  
  // Signals for reactive updates
  otherUserId = signal<string>('');
  otherUser = signal<any>(null);
  unreadCount = signal<number>(0);
  
  // Track userStatuses as a signal to enable computed properties
  userStatusesSignal = signal<Map<string, DUserStatus>>(new Map());
  
  // Computed online status that updates reactively
  isOnline = computed(() => {
    const otherUserId = this.otherUserId();
    const statuses = this.userStatusesSignal();
    const status = statuses?.get(otherUserId);
    return status?.is_online || false;
  });

  async ngOnInit(): Promise<void> {
    this.otherUserId.set(
      this.conversation.user1_id === this.currentUserId
        ? this.conversation.user2_id
        : this.conversation.user1_id
    );
    await this.loadUserInfo();
  }

  ngOnChanges(): void {
    // Update the signal when userStatuses input changes
    if (this.userStatuses) {
      this.userStatusesSignal.set(new Map(this.userStatuses));
    }
  }

  private async loadUserInfo(): Promise<void> {
    const userId = this.otherUserId();
    const user = await this.dChatService.getUserById(userId);
    this.otherUser.set(user);

    // Get unread messages count for this specific conversation
    const unread = await this.dChatService.getUnreadCountForConversation(
      this.currentUserId,
      this.conversation.id
    );
    this.unreadCount.set(unread);
  }

  onSelect(): void {
    this.selectConversation.emit();
  }
}
