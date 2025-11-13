import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingService } from '../../../../core/services/loading.service';

@Component({
  selector: 'app-global-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isLoading()) {
      <div class="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
        <div class="flex flex-col items-center gap-3 rounded-lg bg-white dark:bg-gray-800 px-6 py-5 shadow-lg border border-gray-200 dark:border-gray-700">
          <svg class="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
          <span class="text-sm text-gray-700 dark:text-gray-300">Loading…</span>
        </div>
      </div>
    }
  `,
  styles: []
})
export class GlobalSpinnerComponent {
  private loading = inject(LoadingService);
  isLoading = computed(() => this.loading.isLoading());
}
