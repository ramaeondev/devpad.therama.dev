import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../../../core/services/toast.service';
@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-4 right-4 z-[100] space-y-3 w-80" role="region" aria-label="Notifications">
      @for (t of toasts(); track t.id) {
        <div
          class="flex items-start gap-3 rounded-lg shadow-lg px-4 py-3 border text-sm transition transform bg-white dark:bg-gray-800"
          [ngClass]="{
            'border-green-300 dark:border-green-700': t.type === 'success',
            'border-red-300 dark:border-red-700': t.type === 'error',
            'border-blue-300 dark:border-blue-700': t.type === 'info',
            'border-yellow-300 dark:border-yellow-700': t.type === 'warning',
          }"
          [attr.data-type]="t.type"
        >
          <!-- Icon -->
          <div class="pt-0.5">
            <span
              class="inline-flex h-5 w-5 items-center justify-center rounded-full"
              [ngClass]="{
                'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300':
                  t.type === 'success',
                'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300': t.type === 'error',
                'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300':
                  t.type === 'info',
                'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300':
                  t.type === 'warning',
              }"
              aria-hidden="true"
            >
              @if (t.type === 'success') { <i class="fa-solid fa-check text-xs"></i> }
              @if (t.type === 'error') { <i class="fa-solid fa-xmark text-xs"></i> }
              @if (t.type === 'info') { <i class="fa-solid fa-info text-xs"></i> }
              @if (t.type === 'warning') { <i class="fa-solid fa-exclamation text-xs"></i> }
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
            <i class="fa-solid fa-xmark text-base"></i>
          </button>
        </div>
      }
    </div>
  `,
  styles: [],
})
export class ToastContainerComponent {
  private toast = inject(ToastService);

  toasts = computed(() => this.toast.toastList());

  dismiss(id: Toast['id']) {
    this.toast.remove(id);
  }
}
