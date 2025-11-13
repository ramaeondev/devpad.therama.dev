import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-4 right-4 z-50 space-y-3 w-80" role="region" aria-label="Notifications">
  @for (t of toasts(); track t.id) {
        <div
          class="flex items-start gap-3 rounded-lg shadow-lg px-4 py-3 border text-sm transition transform bg-white dark:bg-gray-800"
          [ngClass]="{
            'border-green-300 dark:border-green-700': t.type === 'success',
            'border-red-300 dark:border-red-700': t.type === 'error',
            'border-blue-300 dark:border-blue-700': t.type === 'info',
            'border-yellow-300 dark:border-yellow-700': t.type === 'warning'
          }"
          [attr.data-type]="t.type"
        >
          <!-- Icon -->
          <div class="pt-0.5">
            <span
              class="inline-flex h-5 w-5 items-center justify-center rounded-full"
              [ngClass]="{
                'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300': t.type === 'success',
                'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300': t.type === 'error',
                'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300': t.type === 'info',
                'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300': t.type === 'warning'
              }"
              aria-hidden="true"
            >
              @if (t.type === 'success') {
                <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-7.5 7.5a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414L8 12.086l6.793-6.793a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
              }
              @if (t.type === 'error') {
                <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-5a1 1 0 112 0 1 1 0 01-2 0zm1-8a1 1 0 00-1 1v5a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
              }
              @if (t.type === 'info') {
                <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10A8 8 0 11-2 10a8 8 0 0120 0zM9 9a1 1 0 112 0v6a1 1 0 11-2 0V9zm1-4a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" clip-rule="evenodd"/></svg>
              }
              @if (t.type === 'warning') {
                <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M8.257 3.099c.765-1.36 2.721-1.36 3.486 0l6.518 11.58c.75 1.334-.213 2.996-1.743 2.996H3.482c-1.53 0-2.493-1.662-1.743-2.996L8.257 3.1z"/><path d="M11 13a1 1 0 10-2 0 1 1 0 002 0zM10 7a1 1 0 00-1 1v2a1 1 0 102 0V8a1 1 0 00-1-1z"/></svg>
              }
            </span>
          </div>

          <!-- Message -->
          <div class="flex-1 text-gray-900 dark:text-gray-100">{{ t.message }}</div>

          <!-- Close -->
          <button
            type="button"
            (click)="dismiss(t.id)"
            class="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            aria-label="Dismiss notification"
          >
            <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: []
})
export class ToastContainerComponent {
  private toast = inject(ToastService);

  toasts = computed(() => this.toast.toastList());

  dismiss(id: Toast['id']) {
    this.toast.remove(id);
  }
}
