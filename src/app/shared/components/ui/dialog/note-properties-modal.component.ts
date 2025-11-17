import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon.component';

export interface NoteProperties {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  owner?: string;
  size?: number;
  folder_name?: string;
  tags?: string[];
  is_favorite?: boolean;
  is_archived?: boolean;
}

@Component({
  selector: 'app-note-properties-modal',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      (click)="cancel.emit()"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md"
        (click)="$event.stopPropagation()"
      >
        <!-- Header -->
        <div
          class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700"
        >
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Note Properties</h2>
          <button
            (click)="cancel.emit()"
            class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <app-icon name="close" [size]="20"></app-icon>
          </button>
        </div>

        <!-- Content -->
        <div class="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          <!-- Title -->
          <div class="property-row">
            <label class="property-label">Name</label>
            <div class="property-value font-medium">{{ properties.title || 'Untitled' }}</div>
          </div>

          <!-- ID -->
          <div class="property-row">
            <label class="property-label">ID</label>
            <div class="property-value font-mono text-xs truncate" [title]="properties.id">
              {{ properties.id }}
            </div>
          </div>

          <!-- Folder -->
          @if (properties.folder_name) {
            <div class="property-row">
              <label class="property-label">Folder</label>
              <div class="property-value">{{ properties.folder_name }}</div>
            </div>
          }

          <!-- Created -->
          <div class="property-row">
            <label class="property-label">Created</label>
            <div class="property-value">{{ formatDate(properties.created_at) }}</div>
          </div>

          <!-- Last Modified -->
          <div class="property-row">
            <label class="property-label">Last Modified</label>
            <div class="property-value">{{ formatDate(properties.updated_at) }}</div>
          </div>

          <!-- Owner -->
          @if (properties.owner) {
            <div class="property-row">
              <label class="property-label">Owner</label>
              <div class="property-value">{{ properties.owner }}</div>
            </div>
          }

          <!-- Size -->
          @if (properties.size !== undefined) {
            <div class="property-row">
              <label class="property-label">Size</label>
              <div class="property-value">{{ formatSize(properties.size) }}</div>
            </div>
          }

          <!-- Tags -->
          @if (properties.tags && properties.tags.length > 0) {
            <div class="property-row">
              <label class="property-label">Tags</label>
              <div class="property-value flex flex-wrap gap-1">
                @for (tag of properties.tags; track tag) {
                  <span
                    class="px-2 py-0.5 text-xs rounded-full bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300"
                  >
                    {{ tag }}
                  </span>
                }
              </div>
            </div>
          }

          <!-- Status -->
          <div class="property-row">
            <label class="property-label">Status</label>
            <div class="property-value flex gap-2">
              @if (properties.is_favorite) {
                <span
                  class="px-2 py-0.5 text-xs rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300"
                >
                  ⭐ Favorite
                </span>
              }
              @if (properties.is_archived) {
                <span
                  class="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  📦 Archived
                </span>
              }
              @if (!properties.is_favorite && !properties.is_archived) {
                <span class="text-sm text-gray-500">Active</span>
              }
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            (click)="cancel.emit()"
            class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .property-row {
        @apply grid grid-cols-3 gap-4 py-2;
      }

      .property-label {
        @apply text-sm font-medium text-gray-500 dark:text-gray-400 col-span-1;
      }

      .property-value {
        @apply text-sm text-gray-900 dark:text-gray-100 col-span-2;
      }
    `,
  ],
})
export class NotePropertiesModalComponent {
  @Input() properties!: NoteProperties;
  @Output() cancel = new EventEmitter<void>();

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  formatSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}
