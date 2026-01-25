import { Component, EventEmitter, Output, signal, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../../core/services/toast.service';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { SupabaseService } from '../../../../core/services/supabase.service';

interface AttachmentFile {
  file: File;
  id: string;
  name: string;
  size: number;
  sizeFormatted: string;
  base64?: string;
}

@Component({
  selector: 'app-contact-us-modal',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div
      class="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm"
      (click)="onBackdropClick()"
    >
      <div
        class="relative bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-lg border-t sm:border border-gray-200 dark:border-gray-800 flex flex-col max-h-[95vh] sm:max-h-[90vh] animate-in fade-in slide-in-from-bottom sm:zoom-in-95 duration-200"
        (click)="$event.stopPropagation()"
      >
        <!-- Header -->
        <div
          class="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-800"
        >
          <h2 class="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
            Contact Us
          </h2>
          <button
            class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
            (click)="close.emit()"
            aria-label="Close"
          >
            <i class="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <!-- Form -->
        <div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <!-- Subject -->
          <div>
            <label
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              for="subject"
            >
              Subject <span class="text-red-500">*</span>
            </label>
            <input
              id="subject"
              type="text"
              [(ngModel)]="subject"
              placeholder="What's this about?"
              maxlength="200"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              [disabled]="sending()"
            />
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
              {{ subject.length }}/200
            </div>
          </div>

          <!-- Message -->
          <div>
            <label
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              for="message"
            >
              Message <span class="text-red-500">*</span>
            </label>
            <textarea
              id="message"
              [(ngModel)]="message"
              placeholder="Tell us what's on your mind..."
              rows="6"
              maxlength="5000"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              [disabled]="sending()"
            ></textarea>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
              {{ message.length }}/5000
            </div>
          </div>

          <!-- File Attachment -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Attachments (optional)
            </label>
            <div class="space-y-2">
              <!-- Upload button -->
              <label
                class="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors"
                [class.opacity-50]="sending() || attachments().length >= 5"
                [class.cursor-not-allowed]="sending() || attachments().length >= 5"
              >
                <input
                  type="file"
                  class="hidden"
                  (change)="onFileSelected($event)"
                  [disabled]="sending() || attachments().length >= 5"
                  multiple
                  accept="*/*"
                />
                <i class="fa-solid fa-paperclip"></i>
                <span>Attach files</span>
              </label>

              <div class="text-xs text-gray-500 dark:text-gray-400">
                Max 6MB total. Up to 5 files.
              </div>

              <!-- Total size indicator -->
              @if (attachments().length > 0) {
                <div
                  class="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <span class="text-xs text-gray-600 dark:text-gray-400">
                    Total size: {{ getTotalSizeFormatted() }}
                  </span>
                  <span
                    class="text-xs font-medium"
                    [class.text-red-600]="getTotalSize() > MAX_TOTAL_SIZE"
                    [class.text-green-600]="getTotalSize() <= MAX_TOTAL_SIZE && getTotalSize() > 0"
                  >
                    {{ ((getTotalSize() / MAX_TOTAL_SIZE) * 100).toFixed(0) }}% of 6MB
                  </span>
                </div>
              }

              <!-- Attached files list -->
              @for (attachment of attachments(); track attachment.id) {
                <div
                  class="flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <i class="fa-solid fa-file text-blue-600 dark:text-blue-400"></i>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {{ attachment.name }}
                    </div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">
                      {{ attachment.sizeFormatted }}
                    </div>
                  </div>
                  <button
                    class="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
                    (click)="removeAttachment(attachment.id)"
                    [disabled]="sending()"
                    aria-label="Remove attachment"
                  >
                    <i class="fa-solid fa-xmark"></i>
                  </button>
                </div>
              }
            </div>
          </div>

          <!-- Warning for size limit -->
          @if (getTotalSize() > MAX_TOTAL_SIZE) {
            <div
              class="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
            >
              <i class="fa-solid fa-triangle-exclamation text-red-600 dark:text-red-400 mt-0.5"></i>
              <div class="text-xs text-red-700 dark:text-red-300">
                Total attachment size exceeds 6MB limit. Please remove some files.
              </div>
            </div>
          }
        </div>

        <!-- Footer -->
        <div
          class="flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50"
        >
          <button
            class="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            (click)="close.emit()"
            [disabled]="sending()"
          >
            Cancel
          </button>
          <button
            class="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            (click)="sendMessage()"
            [disabled]="!canSend() || sending()"
          >
            @if (sending()) {
              <i class="fa-solid fa-spinner fa-spin"></i>
              <span>Sending...</span>
            } @else {
              <i class="fa-solid fa-paper-plane"></i>
              <span>Send Message</span>
            }
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [],
})
export class ContactUsModalComponent {
  @Output() close = new EventEmitter<void>();

  private toast = inject(ToastService);
  private auth = inject(AuthStateService);
  private supabase = inject(SupabaseService);

  subject = '';
  message = '';
  attachments = signal<AttachmentFile[]>([]);
  sending = signal(false);

  // Supabase Edge Functions have a 6MB payload limit.
  readonly MAX_FILE_SIZE = 6 * 1024 * 1024; // 6MB
  readonly MAX_TOTAL_SIZE = 6 * 1024 * 1024; // 6MB
  readonly MAX_FILES = 5;

  onBackdropClick() {
    if (!this.sending()) {
      this.close.emit();
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);

    if (files.length === 0) return;

    // Check if adding these files would exceed the max file count
    if (this.attachments().length + files.length > this.MAX_FILES) {
      this.toast.error(`You can only attach up to ${this.MAX_FILES} files`);
      input.value = '';
      return;
    }

    const validFiles: AttachmentFile[] = [];
    let hasError = false;

    for (const file of files) {
      // Check individual file size
      if (file.size > this.MAX_FILE_SIZE) {
        this.toast.error(`${file.name} exceeds 6MB limit`);
        hasError = true;
        continue;
      }

      // Check if adding this file would exceed total size
      const currentTotal = this.getTotalSize();
      if (currentTotal + file.size > this.MAX_TOTAL_SIZE) {
        this.toast.error(`Adding ${file.name} would exceed 6MB total limit`);
        hasError = true;
        continue;
      }

      validFiles.push({
        file,
        id: `${Date.now()}_${Math.random()}`,
        name: file.name,
        size: file.size,
        sizeFormatted: this.formatFileSize(file.size),
      });
    }

    if (validFiles.length > 0) {
      this.attachments.update((current) => [...current, ...validFiles]);
      if (!hasError) {
        this.toast.success(`${validFiles.length} file(s) attached`);
      }
    }

    input.value = '';
  }

  removeAttachment(id: string) {
    this.attachments.update((current) => current.filter((a) => a.id !== id));
  }

  getTotalSize(): number {
    return this.attachments().reduce((sum, att) => sum + att.size, 0);
  }

  getTotalSizeFormatted(): string {
    return this.formatFileSize(this.getTotalSize());
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  canSend(): boolean {
    return (
      this.subject.trim().length > 0 &&
      this.message.trim().length > 0 &&
      this.getTotalSize() <= this.MAX_TOTAL_SIZE
    );
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // Remove data URL prefix (e.g., "data:image/png;base64,")
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  }

  async sendMessage() {
    if (!this.canSend() || this.sending()) return;

    try {
      this.sending.set(true);

      // Convert files to base64
      const processedAttachments = await Promise.all(
        this.attachments().map(async (att) => ({
          filename: att.name,
          content: await this.fileToBase64(att.file),
          encoding: 'base64',
        })),
      );

      const payload = {
        subject: this.subject.trim(),
        message: this.message.trim(),
        userEmail: this.auth.userEmail() || 'anonymous@devpad.app',
        userName: this.getUserName(),
        attachments: processedAttachments,
      };

      const { error } = await this.supabase.client.functions.invoke('send-contact-email', {
        body: payload,
      });

      if (error) throw error;

      this.toast.success("Message sent successfully! We'll get back to you soon.");
      this.resetForm();
      this.close.emit();
    } catch (error) {
      console.error('Error sending message:', error);
      this.toast.error(
        error instanceof Error ? error.message : 'Failed to send message. Please try again.',
      );
    } finally {
      this.sending.set(false);
    }
  }

  private getUserName(): string {
    const user = this.auth.userEmail();
    if (!user) return 'Anonymous User';
    return user.split('@')[0];
  }

  private resetForm() {
    this.subject = '';
    this.message = '';
    this.attachments.set([]);
  }
}
