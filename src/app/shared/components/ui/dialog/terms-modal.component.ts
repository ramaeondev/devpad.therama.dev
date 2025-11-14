import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-terms-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-[70] flex items-center justify-center" role="dialog" aria-modal="true">
      <div class="absolute inset-0 bg-black/40" (click)="close.emit()"></div>
      <div class="relative w-full max-w-3xl h-[80vh] rounded-lg bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col">
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">{{ title }}</h3>
          <button class="px-2 py-1 text-sm text-gray-600 dark:text-gray-300" (click)="close.emit()">Close</button>
        </div>
        <div class="flex-1">
          <iframe
            title="Terms and Conditions"
            [src]="termsSrc"
            class="w-full h-full border-0 bg-white dark:bg-gray-800"
          ></iframe>
        </div>
        <div class="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          <button class="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-700" (click)="close.emit()">Close</button>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class TermsModalComponent {
  @Input() title = 'Terms & Conditions';
  /** Path to an HTML page under public/, e.g. '/terms.html' */
  @Input() termsSrc: string = '/terms.html';
  @Output() close = new EventEmitter<void>();
}
