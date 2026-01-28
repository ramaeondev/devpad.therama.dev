import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DMessage, DChatUser } from '../../../../core/models/d-chat.model';

@Component({
  selector: 'app-reply-block',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (parentMessage) {
      <div
        class="reply-block border-l-4 border-retro-green bg-gray-800/50 rounded p-3 mb-2 text-sm max-w-md cursor-pointer hover:bg-gray-800 transition-colors relative group"
      >
        <!-- Close button -->
        <button
          (click)="onClear()"
          class="absolute top-1 right-1 text-gray-400 hover:text-retro-green transition-colors opacity-0 group-hover:opacity-100"
          title="Clear reply"
          type="button"
          aria-label="Clear reply"
        >
          <i class="fa-solid fa-xmark"></i>
        </button>

        <!-- Message content preview -->
        <div class="text-gray-300 text-xs break-words line-clamp-2">
          {{ parentMessage.content }}
        </div>

        <!-- Attachment indicator -->
        @if (parentMessage.attachments && parentMessage.attachments.length > 0) {
          <div class="text-retro-green/60 text-xs mt-1">
            <i class="fa-solid fa-paperclip mr-1"></i>
            {{ parentMessage.attachments.length }} file(s)
          </div>
        }
      </div>
    }
  `,
  styles: [
    `
      .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
    `,
  ],
})
export class ReplyBlockComponent {
  @Input() parentMessage: DMessage | null = null;
  @Input() userMap!: Map<string, DChatUser>;
  @Output() clearReply = new EventEmitter<void>();

  onClear(): void {
    this.clearReply.emit();
  }
}

