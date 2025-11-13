import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-folder-name-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-[70] flex items-center justify-center" role="dialog" aria-modal="true">
      <div class="absolute inset-0 bg-black/40" (click)="onCancel()"></div>
      <div class="relative w-full max-w-md rounded-lg bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 p-5">
        <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">Create folder</h3>
        <label class="block text-sm text-gray-600 dark:text-gray-400 mb-1" for="folderName">Folder name</label>
        <input
          id="folderName"
          class="w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          [value]="name()"
          (input)="onInput($event)"
          (keydown.enter)="trySubmit()"
          (keydown.escape)="onCancel()"
          autofocus
        />
        @if (error()) {
          <p class="mt-2 text-xs text-red-600">{{ error() }}</p>
        }
        <div class="mt-4 flex justify-end gap-2">
          <button type="button" class="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-700" (click)="onCancel()">Cancel</button>
          <button type="button" class="px-3 py-1.5 text-sm rounded bg-primary-600 text-white disabled:opacity-50" [disabled]="!name().trim()" (click)="trySubmit()">Create</button>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class FolderNameModalComponent {
  @Input() parentName?: string;
  @Output() cancel = new EventEmitter<void>();
  @Output() submit = new EventEmitter<string>();

  name = signal('');
  error = signal<string | null>(null);

  onInput(e: Event) {
    const target = e.target as HTMLInputElement;
    this.name.set(target.value);
  }

  onCancel() {
    this.cancel.emit();
  }

  trySubmit() {
    const trimmed = this.name().trim();
    if (!trimmed) {
      this.error.set('Name is required');
      return;
    }
    // Clear and emit; duplicate check happens in caller/service
    this.error.set(null);
    this.submit.emit(trimmed);
  }
}
