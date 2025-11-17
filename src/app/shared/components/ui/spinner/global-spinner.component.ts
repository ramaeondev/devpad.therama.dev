import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingService } from '../../../../core/services/loading.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-global-spinner',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    @if (isLoading()) {
      <div
        class="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-[1px]"
      >
        <div
          class="flex flex-col items-center gap-3 rounded-lg bg-white dark:bg-gray-800 px-6 py-5 shadow-lg border border-gray-200 dark:border-gray-700"
        >
          <app-icon name="autorenew" [size]="24" class="animate-spin h-6 w-6 text-blue-600"></app-icon>
          <span class="text-sm text-gray-700 dark:text-gray-300">Loading…</span>
        </div>
      </div>
    }
  `,
  styles: [],
})
export class GlobalSpinnerComponent {
  private loading = inject(LoadingService);
  isLoading = computed(() => this.loading.isLoading());
}
