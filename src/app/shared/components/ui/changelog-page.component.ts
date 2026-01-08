import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LogoComponent } from './logo/logo.component';
import { AppwriteService } from '../../../core/services/appwrite.service';

@Component({
  selector: 'app-changelog-page',
  standalone: true,
  imports: [CommonModule, RouterLink, LogoComponent],
  template: `
    <div class="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center py-10 px-4">
      <!-- Back Button -->
      <div class="w-full max-w-2xl mb-4">
        <a
          routerLink="/"
          class="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors group"
        >
          <i
            class="fa-solid fa-arrow-left text-sm group-hover:-translate-x-1 transition-transform"
          ></i>
          <span class="font-medium">Back to Home</span>
        </a>
      </div>

      <app-logo class="mb-6" [isClickable]="true"></app-logo>
      <h1 class="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">Changelog</h1>

      @if (loading()) {
        <div class="flex justify-center items-center py-8">
          <i class="fa-solid fa-spinner fa-spin text-3xl text-blue-500"></i>
        </div>
      } @else if (error()) {
        <div class="text-red-600 dark:text-red-400 text-center py-4">
          <i class="fa-solid fa-exclamation-circle mr-2"></i>
          Failed to load changelog. Please try again later.
        </div>
      } @else {
        <div class="prose dark:prose-invert max-w-2xl w-full text-sm">
          @for (entry of changelog(); track entry.date) {
            <div class="font-semibold text-blue-700 dark:text-blue-300 mb-2">{{ entry.date }}</div>
            <ul class="mb-4 list-disc pl-6">
              @for (change of entry.changes; track change) {
                <li>{{ change }}</li>
              }
            </ul>
          }
        </div>
      }
    </div>
  `,
  styles: [],
})
export class ChangelogPageComponent implements OnInit {
  private appwriteService = inject(AppwriteService);

  changelog = signal<{ date: string; changes: string[] }[]>([]);
  loading = signal(false);
  error = signal(false);

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
}
