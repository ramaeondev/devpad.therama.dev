import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DMessage, DChatUser } from '../../../../core/models/d-chat.model';

@Component({
  selector: 'app-message-reply',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (message.replied_message) {
      <div
        class="replied-message-quote border-l-4 border-retro-green/50 bg-gray-800/30 rounded pl-3 py-2 mb-3 text-xs max-w-xs cursor-pointer hover:bg-gray-800/50 transition-colors group"
        (click)="onQuoteClick()"
        role="button"
        tabindex="0"
        (keydown.enter)="onQuoteClick()"
        (keydown.space)="onQuoteClick()"
        title="Click to scroll to original message"
      >
        <!-- Quoted sender -->
        <div class="text-retro-green/70 font-mono font-bold mb-1">
          {{ getSenderName() }}
        </div>

        <!-- Quoted content -->
        @if (message.replied_message!.content) {
          <div class="text-gray-300 break-words line-clamp-2 group-hover:text-gray-200 transition-colors">
            {{ message.replied_message!.content }}
          </div>
        } @else {
          <div class="text-gray-500 italic">Message not found</div>
        }

        <!-- Quoted attachments indicator -->
        @if (message.replied_message!.attachments && message.replied_message!.attachments.length > 0) {
          <div class="text-retro-green/50 text-xs mt-1 group-hover:text-retro-green/70 transition-colors">
            <i class="fa-solid fa-paperclip mr-1"></i>
            {{ message.replied_message!.attachments.length }} file(s)
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
export class MessageReplyComponent {
  @Input() message!: DMessage;
  @Input() userMap!: Map<string, DChatUser>;
  @Output() scrollToMessage = new EventEmitter<string>();

  onQuoteClick(): void {
    if (this.message.replied_message?.id) {
      this.scrollToMessage.emit(this.message.replied_message.id);
    }
  }

  getSenderName(): string {
    if (!this.message.replied_message) return 'Unknown';
    const senderName = this.userMap?.get(this.message.replied_message.sender_id);
    if (senderName?.first_name || senderName?.last_name) {
      return `${senderName.first_name || ''} ${senderName.last_name || ''}`.trim();
    }
    return senderName?.email?.split('@')[0]?.toUpperCase() || 'Unknown';
  }
}

