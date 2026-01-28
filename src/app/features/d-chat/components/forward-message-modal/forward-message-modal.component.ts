import { Component, Output, EventEmitter, Input, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DChatService } from '../../d-chat.service';
import { DMessage, DChatUser } from '../../../../core/models/d-chat.model';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-forward-message-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      class="forward-message-modal fixed inset-0 md:absolute md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 flex items-center justify-center z-50"
    >
      <!-- Backdrop -->
      <button
        class="absolute inset-0 bg-black/80 md:hidden"
        (click)="onClose()"
        (keydown.escape)="onClose()"
        aria-label="Close forward dialog"
        type="button"
        [style.pointer-events]="'auto'"
      ></button>

      <!-- Modal -->
      <div
        class="relative bg-black border-2 border-retro-green w-full md:w-96 max-h-96 md:max-h-full p-4 flex flex-col"
      >
        <!-- Header -->
        <div class="flex items-center justify-between mb-4 pb-3 border-b border-retro-green/30">
          <h2 class="font-mono text-lg font-bold text-retro-green">FORWARD MESSAGE</h2>
          <button
            (click)="onClose()"
            class="p-1 text-retro-green hover:text-retro-green/80 transition-colors"
            aria-label="Close forward dialog"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <!-- Message Preview -->
        <div class="mb-4 p-3 bg-gray-900 border border-retro-green/30 rounded">
          <p class="text-xs text-gray-400 uppercase mb-1">Message to forward:</p>
          <p class="text-sm text-retro-green font-mono truncate">{{ message.content }}</p>
        </div>

        <!-- Search Input -->
        <div class="mb-4">
          <input
            [(ngModel)]="searchQuery"
            (input)="onSearch()"
            placeholder="SEARCH USER BY EMAIL..."
            class="w-full bg-gray-900 border-2 border-retro-green text-retro-green font-mono text-sm p-2 placeholder-gray-500 focus:outline-none focus:border-retro-green/80"
            aria-label="Search users to forward message"
          />
        </div>

        <!-- Search Results -->
        <div class="flex-1 overflow-y-auto space-y-1">
          @if (searching()) {
            <div class="flex items-center justify-center py-8">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-retro-green"></div>
            </div>
          } @else if (results().length === 0 && searchQuery) {
            <div class="p-4 text-center text-gray-400">
              <p class="font-mono text-sm">NO USERS FOUND</p>
            </div>
          } @else if (results().length === 0) {
            <div class="p-4 text-center text-gray-400">
              <p class="font-mono text-sm">ENTER AN EMAIL TO SEARCH</p>
            </div>
          } @else {
            @for (user of results(); track user.id) {
              <button
                (click)="onForwardToUser(user)"
                [disabled]="forwarding()"
                class="user-result w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-gray-800 border border-retro-green/20 hover:border-retro-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div class="relative flex-shrink-0">
                  <div
                    class="w-10 h-10 rounded bg-retro-green/20 border border-retro-green flex items-center justify-center"
                  >
                    @if (user.avatar_url) {
                      <img
                        [src]="user.avatar_url"
                        alt="{{ user.first_name }}"
                        class="w-full h-full rounded object-cover"
                      />
                    } @else {
                      <span class="text-retro-green font-mono text-sm font-bold">
                        {{ (user.first_name || 'U')[0] | uppercase }}
                      </span>
                    }
                  </div>
                  @if (user.is_online) {
                    <div
                      class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-retro-green rounded-full border border-black"
                    ></div>
                  }
                </div>
                <div class="flex-1">
                  <h3 class="font-mono text-sm text-retro-green font-bold">
                    {{ user.email }}
                  </h3>
                  <p class="text-xs text-gray-400">{{ user.first_name }} {{ user.last_name }}</p>
                  <p class="text-xs text-gray-400">
                    @if (user.is_online) {
                      <span class="text-retro-green">● ONLINE</span>
                    } @else {
                      <span>OFFLINE</span>
                    }
                  </p>
                </div>
              </button>
            }
          }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .forward-message-modal {
        display: flex;
      }
    `,
  ],
})
export class ForwardMessageModalComponent {
  @Input() message!: DMessage;
  @Output() userSelected = new EventEmitter<DChatUser>();
  @Output() closeModal = new EventEmitter<void>();

  private readonly dChatService = inject(DChatService);
  private readonly toast = inject(ToastService);

  searchQuery = '';
  searching = signal(false);
  results = signal<DChatUser[]>([]);
  forwarding = signal(false);

  async onSearch(): Promise<void> {
    if (!this.searchQuery.trim()) {
      this.results.set([]);
      return;
    }

    this.searching.set(true);
    try {
      const users = await this.dChatService.searchUsers(this.searchQuery);
      this.results.set(users);
    } catch (error) {
      console.error('Error searching users:', error);
      this.results.set([]);
      this.toast.error('Failed to search users');
    } finally {
      this.searching.set(false);
    }
  }

  onForwardToUser(user: DChatUser): void {
    this.forwarding.set(true);
    try {
      this.userSelected.emit(user);
      this.toast.success(`Message forwarded to ${user.first_name}`);
      this.closeModal.emit();
    } catch (error) {
      console.error('Error forwarding message:', error);
      this.toast.error('Failed to forward message');
    } finally {
      this.forwarding.set(false);
    }
  }

  onClose(): void {
    this.closeModal.emit();
  }
}
