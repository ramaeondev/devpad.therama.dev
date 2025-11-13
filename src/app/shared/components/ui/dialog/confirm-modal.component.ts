import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-[70] flex items-center justify-center" role="dialog" aria-modal="true">
      <div class="absolute inset-0 bg-black/40" (click)="onCancel()"></div>
      <div class="relative w-full max-w-md rounded-lg bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 p-5">
        <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">{{ title }}</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400">{{ message }}</p>
        <div class="mt-4 flex justify-end gap-2">
          <button type="button" class="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-700" (click)="onCancel()">{{ cancelLabel }}</button>
          <button type="button" class="px-3 py-1.5 text-sm rounded bg-red-600 text-white" (click)="onConfirm()">{{ confirmLabel }}</button>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class ConfirmModalComponent {
  @Input() title = 'Confirm';
  @Input() message = 'Are you sure?';
  @Input() confirmLabel = 'Confirm';
  @Input() cancelLabel = 'Cancel';
  @Output() cancel = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();

  onCancel() { this.cancel.emit(); }
  onConfirm() { this.confirm.emit(); }
}
