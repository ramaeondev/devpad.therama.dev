import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  HostListener,
  ElementRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DMessage } from '../../../../core/models/d-chat.model';
import { ClickOutsideDirective } from '../../directives/click-outside.directive';

export type MessageAction =
  | 'reply'
  | 'forward'
  | 'copy'
  | 'edit'
  | 'delete'
  | 'pin'
  | 'download'
  | 'open';

@Component({
  selector: 'app-message-kebab-menu',
  standalone: true,
  imports: [CommonModule, ClickOutsideDirective],
  template: `
    <div class="message-kebab-menu relative" (clickOutside)="closeMenu()">
      <!-- Kebab Menu Button -->
      <button
        type="button"
        class="p-1.5 text-sm hover:bg-retro-green hover:text-black rounded transition-colors text-retro-green bg-gray-800 border border-retro-green/50"
        (click)="toggleMenu()"
        title="Message actions"
        aria-label="Message options menu"
        aria-haspopup="true"
        [attr.aria-expanded]="isMenuOpen()"
      >
        <i class="fa-solid fa-ellipsis-vertical"></i>
      </button>

      <!-- Dropdown Menu -->
      @if (isMenuOpen()) {
        <div
          class="absolute right-0 mt-1 w-48 bg-gray-900 border border-retro-green rounded shadow-lg z-[9999] animate-fade-in"
        >
          <div class="py-1">
            <!-- Reply Option -->
            <button
              type="button"
              class="w-full text-left px-4 py-2 text-sm hover:bg-retro-green/20 text-retro-green flex items-center gap-2 transition-colors"
              (click)="onAction('reply')"
              [disabled]="!isOwn && isAlreadyReplied()"
            >
              <i class="fa-solid fa-reply text-xs"></i>
              <span>Reply</span>
            </button>

            <!-- Forward Option -->
            <button
              type="button"
              class="w-full text-left px-4 py-2 text-sm hover:bg-retro-green/20 text-retro-green flex items-center gap-2 transition-colors"
              (click)="onAction('forward')"
            >
              <i class="fa-solid fa-share text-xs"></i>
              <span>Forward</span>
            </button>

            <!-- Copy Option -->
            <button
              type="button"
              class="w-full text-left px-4 py-2 text-sm hover:bg-retro-green/20 text-retro-green flex items-center gap-2 transition-colors"
              (click)="onAction('copy')"
            >
              <i class="fa-solid fa-copy text-xs"></i>
              <span>Copy</span>
            </button>

            <!-- Edit Option (only for own messages) -->
            @if (isOwn) {
              <button
                type="button"
                class="w-full text-left px-4 py-2 text-sm hover:bg-retro-green/20 text-retro-green flex items-center gap-2 transition-colors"
                (click)="onAction('edit')"
              >
                <i class="fa-solid fa-pencil text-xs"></i>
                <span>Edit</span>
              </button>
            }

            <!-- Pin Option (only for own messages) -->
            @if (isOwn) {
              <button
                type="button"
                class="w-full text-left px-4 py-2 text-sm hover:bg-retro-green/20 text-retro-green flex items-center gap-2 transition-colors"
                (click)="onAction('pin')"
              >
                <i class="fa-solid fa-thumbtack text-xs"></i>
                <span>{{ isPinned ? 'Unpin' : 'Pin' }}</span>
              </button>
            }

            <!-- Divider -->
            <div class="border-t border-retro-green/30 my-1"></div>

            <!-- Download Option (if message has attachments) -->
            @if (message.attachments && message.attachments.length > 0) {
              <button
                type="button"
                class="w-full text-left px-4 py-2 text-sm hover:bg-retro-green/20 text-retro-green flex items-center gap-2 transition-colors"
                (click)="onAction('download')"
              >
                <i class="fa-solid fa-download text-xs"></i>
                <span>Download</span>
              </button>

              <!-- Open Option (if message has attachments) -->
              <button
                type="button"
                class="w-full text-left px-4 py-2 text-sm hover:bg-retro-green/20 text-retro-green flex items-center gap-2 transition-colors"
                (click)="onAction('open')"
              >
                <i class="fa-solid fa-external-link text-xs"></i>
                <span>Open</span>
              </button>

              <div class="border-t border-retro-green/30 my-1"></div>
            }

            <!-- Delete Option (only for own messages) -->
            @if (isOwn) {
              <button
                type="button"
                class="w-full text-left px-4 py-2 text-sm hover:bg-red-500/20 text-red-400 flex items-center gap-2 transition-colors"
                (click)="onAction('delete')"
              >
                <i class="fa-solid fa-trash text-xs"></i>
                <span>Delete</span>
              </button>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .message-kebab-menu {
        display: inline-block;
      }
    `,
  ],
})
export class MessageKebabMenuComponent {
  @Input() message!: DMessage;
  @Input() isOwn: boolean = false;
  @Input() isPinned: boolean = false;
  @Input() isAlreadyReplied!: { (): boolean };
  @Output() action = new EventEmitter<MessageAction>();

  private elementRef = inject(ElementRef);

  isMenuOpen = signal(false);

  toggleMenu(): void {
    this.isMenuOpen.update((val) => !val);
  }

  closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  onAction(action: MessageAction): void {
    this.action.emit(action);
    this.closeMenu();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeMenu();
    }
  }
}
