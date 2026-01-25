import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DMessage } from '../../../../core/models/d-chat.model';

@Component({
  selector: 'app-chat-message',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="message flex animate-fade-in"
      [class.justify-end]="isOwn"
      [class.justify-start]="!isOwn"
    >
      <div
        class="message-bubble max-w-xs lg:max-w-md px-3 py-2 rounded font-mono text-sm break-words"
        [class.bg-retro-green]="isOwn"
        [class.text-black]="isOwn"
        [class.bg-gray-700]="!isOwn"
        [class.text-retro-green]="!isOwn"
        [class.border-l-2]="!isOwn"
        [class.border-retro-green]="!isOwn"
      >
        <p class="whitespace-pre-wrap">{{ message.content }}</p>
        <div
          class="text-xs mt-1 opacity-60 flex items-center gap-1"
          [class.text-black]="isOwn"
          [class.text-gray-300]="!isOwn"
        >
          <span>{{ formatTime(message.created_at) }}</span>
          @if (isOwn) {
            @if (message.read) {
              <i class="fa-solid fa-check-double text-retro-green"></i>
            } @else {
              <i class="fa-solid fa-check"></i>
            }
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .message {
      animation: fade-in 0.3s ease-in;
    }

    @keyframes fade-in {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .message-bubble {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      transition: all 0.2s ease;

      &:hover {
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
      }
    }
  `],
})
export class ChatMessageComponent {
  @Input() message!: DMessage;
  @Input() isOwn: boolean = false;
  @Input() otherUserOnline: boolean = false;

  formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }
}
