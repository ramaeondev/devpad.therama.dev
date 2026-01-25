import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnChanges,
  SimpleChanges,
  inject,
} from '@angular/core';

import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-terms-modal',
  standalone: true,
  imports: [],
  template: `
    <div
      class="fixed inset-0 z-[70] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      <div class="absolute inset-0 bg-black/40" (click)="close.emit()"></div>
      <div
        class="relative w-full max-w-3xl h-[80vh] rounded-lg bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col"
      >
        <div
          class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700"
        >
          <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">{{ title }}</h3>
          <button class="px-2 py-1 text-sm text-gray-600 dark:text-gray-300" (click)="close.emit()">
            Close
          </button>
        </div>
        <div class="flex-1">
          <iframe
            title="Terms and Conditions"
            [src]="safeSrc"
            class="w-full h-full border-0 bg-white dark:bg-gray-800"
          ></iframe>
        </div>
        <div class="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          <button
            class="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-700"
            (click)="close.emit()"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [],
})
export class TermsModalComponent implements OnChanges {
  @Input() title = 'Terms & Conditions';
  /** Path to an Angular route or component for terms */
  @Input() termsSrc: string = '/terms';
  @Output() close = new EventEmitter<void>();

  safeSrc: SafeResourceUrl;
  private sanitizer = inject(DomSanitizer);

  constructor() {
    this.safeSrc = this.trustSrc(this.termsSrc);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['termsSrc']) {
      this.safeSrc = this.trustSrc(this.termsSrc);
    }
  }

  private trustSrc(_path: string): SafeResourceUrl {
    try {
      // For Angular, just use the route directly
      return this.sanitizer.bypassSecurityTrustResourceUrl(this.termsSrc);
    } catch {
      return this.sanitizer.bypassSecurityTrustResourceUrl(this.termsSrc);
    }
  }
}
