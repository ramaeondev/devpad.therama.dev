import { Component, Input, signal, inject } from '@angular/core';

import { SupabaseService } from '../../../../core/services/supabase.service';
import { ToastService } from '../../../../core/services/toast.service';
@Component({
  selector: 'app-document-preview-modal',
  standalone: true,
  imports: [],
  template: `
    <div
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      (click)="close()"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden"
        (click)="$event.stopPropagation()"
      >
        <div
          class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700"
        >
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ note?.title }}</h2>
          <div class="flex items-center gap-2">
            <button
              class="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1"
              (click)="download()"
            >
              <i class="fa-solid fa-download text-base"></i>
              <span>Download</span>
            </button>
            <button class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700" (click)="close()">
              <i class="fa-solid fa-xmark text-xl"></i>
            </button>
          </div>
        </div>
        <div class="p-4 max-h-[calc(90vh-80px)] overflow-auto">
          @if (previewUrl()) {
            @if (isPdf()) {
              <iframe [src]="previewUrl()!" class="w-full h-[600px] border rounded"></iframe>
            } @else if (isImage()) {
              <img [src]="previewUrl()!" class="max-w-full h-auto rounded" />
            } @else {
              <div class="text-center py-8">
                <div class="text-gray-500 dark:text-gray-400 text-lg mb-2">
                  No Preview Available
                </div>
                <div class="text-sm text-gray-400">
                  This file type cannot be previewed in the browser.
                </div>
                <button
                  class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2"
                  (click)="download()"
                >
                  <i class="fa-solid fa-download text-xl"></i>
                  <span>Download File</span>
                </button>
              </div>
            }
          } @else {
            <div class="text-center py-8">
              <div class="text-gray-500 dark:text-gray-400">Loading preview...</div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [],
})
export class DocumentPreviewModalComponent {
  @Input() note: any;
  @Input() close!: () => void;

  private supabase = inject(SupabaseService);
  private toast = inject(ToastService);

  previewUrl = signal<string | null>(null);

  ngOnInit() {
    this.loadPreview();
  }

  private async loadPreview() {
    if (!this.note?.content || !this.note.content.startsWith('storage://')) return;

    try {
      const path = this.note.content.replace('storage://notes/', '');
      const { data, error } = await this.supabase.storage.from('notes').createSignedUrl(path, 3600); // 1 hour
      if (error || !data?.signedUrl) throw error;
      this.previewUrl.set(data.signedUrl);
    } catch (error) {
      console.error('Failed to load preview:', error);
      this.toast.error('Failed to load document preview');
    }
  }

  isPdf(): boolean {
    return this.note?.content?.includes('.pdf');
  }

  isImage(): boolean {
    const ext = this.getExtension();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
  }

  private getExtension(): string {
    if (!this.note?.content) return '';
    const path = this.note.content.replace('storage://notes/', '');
    return path.split('.').pop()?.toLowerCase() || '';
  }

  async download() {
    if (!this.previewUrl()) return;
    const link = document.createElement('a');
    link.href = this.previewUrl()!;
    link.download = this.note?.title || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
