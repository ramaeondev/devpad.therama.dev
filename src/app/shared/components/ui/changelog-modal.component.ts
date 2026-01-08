import { Component, signal, EventEmitter, Output, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LogoComponent } from './logo/logo.component';
import { AppwriteService } from '../../../core/services/appwrite.service';

@Component({
  selector: 'app-changelog-modal',
  standalone: true,
  imports: [CommonModule, LogoComponent],
  template: `
    <div
      class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
      (click)="onClose()"
    >
      <div
        class="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full mx-4 overflow-auto max-h-[90vh] p-6 relative"
        (click)="$event.stopPropagation()"
      >
        <div class="flex flex-col items-center mb-4">
          <app-logo></app-logo>
        </div>
        <h2 class="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Changelog</h2>

        @if (loading()) {
          <div class="flex justify-center items-center py-8">
            <i class="fa-solid fa-spinner fa-spin text-2xl text-blue-500"></i>
          </div>
        } @else if (error()) {
          <div class="text-red-600 dark:text-red-400 text-center py-4">
            <i class="fa-solid fa-exclamation-circle mr-2"></i>
            Failed to load changelog. Please try again later.
          </div>
        } @else {
          <div class="prose dark:prose-invert max-w-none text-sm">
            @for (entry of changelog(); track entry.date) {
              <div class="font-semibold text-blue-700 dark:text-blue-300 mb-2">
                {{ entry.date }}
              </div>
              <ul class="mb-4 list-disc pl-6">
                @for (change of entry.changes; track change) {
                  <li>{{ change }}</li>
                }
              </ul>
            }
          </div>
        }

        <button
          class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          (click)="onClose()"
          aria-label="Close"
        >
          <i class="fa-solid fa-xmark text-lg"></i>
        </button>
      </div>
    </div>
  `,
  styles: [],
})
export class ChangelogModalComponent implements OnInit {
  private appwriteService = inject(AppwriteService);

  changelog = signal<{ date: string; changes: string[] }[]>([]);
  loading = signal(false);
  error = signal(false);
  show = signal(false);

  @Output() close = new EventEmitter<void>();

  async ngOnInit() {
    await this.loadChangelog();
  }

  async loadChangelog() {
    this.loading.set(true);
    this.error.set(false);

    try {
      const data = await this.appwriteService.getChangelogs();
      this.changelog.set(data);
    } catch (err) {
      console.error('Failed to load changelog:', err);
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  onClose() {
    this.close.emit();
    this.show.set(false);
  }
}
