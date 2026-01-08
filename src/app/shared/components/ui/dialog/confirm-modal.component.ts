import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      class="fixed inset-0 z-[70] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      <div class="absolute inset-0 bg-black/40" (click)="onCancel()"></div>
      <div
        class="relative w-full max-w-md rounded-lg bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 p-5"
      >
        <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">{{ title }}</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400">{{ message }}</p>
        <ng-container *ngIf="showInput">
          <input
            type="text"
            class="mt-4 w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-700"
            [placeholder]="inputPlaceholder"
            [(ngModel)]="inputValue"
            (ngModelChange)="inputChange.emit(inputValue)"
          />
        </ng-container>
        <div class="mt-4 flex justify-end gap-2">
          <button
            type="button"
            class="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-700"
            (click)="onCancel()"
          >
            {{ cancelLabel }}
          </button>
          <button
            type="button"
            class="px-3 py-1.5 text-sm rounded bg-red-600 text-white"
            [disabled]="confirmDisabled"
            (click)="onConfirm()"
          >
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [],
})
export class ConfirmModalComponent {
  @Input() showInput = false;
  @Input() inputPlaceholder = '';
  @Input() inputValue = '';
  @Input() confirmDisabled = false;
  @Output() inputChange = new EventEmitter<string>();
  @Input() title = 'Confirm';
  @Input() message = 'Are you sure?';
  @Input() confirmLabel = 'Confirm';
  @Input() cancelLabel = 'Cancel';
  @Output() cancel = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();

  onCancel() {
    this.cancel.emit();
  }
  onConfirm() {
    this.confirm.emit();
  }
}
