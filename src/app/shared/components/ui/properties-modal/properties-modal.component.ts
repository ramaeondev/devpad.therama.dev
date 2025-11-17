import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon.component';

export interface PropertyItem {
  label: string;
  value: string;
  icon?: string;
}

@Component({
  selector: 'app-properties-modal',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    @if (isOpen) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" (click)="close()">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden" (click)="$event.stopPropagation()">
          <!-- Header -->
          <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ title }}</h2>
            <button
              (click)="close()"
              class="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <app-icon name="close" [size]="20" class="text-gray-500 dark:text-gray-400"></app-icon>
            </button>
          </div>

          <!-- Content -->
          <div class="p-4 overflow-y-auto max-h-[calc(80vh-8rem)]">
            @if (properties.length > 0) {
              <div class="space-y-4">
                @for (prop of properties; track prop.label) {
                  <div class="flex flex-col gap-1">
                    <div class="flex items-center gap-2">
                      @if (prop.icon) {
                        <span class="text-gray-500 dark:text-gray-400">{{ prop.icon }}</span>
                      }
                      <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ prop.label }}</span>
                    </div>
                    <div class="text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-2 break-all">
                      {{ prop.value }}
                    </div>
                  </div>
                }
              </div>
            } @else {
              <div class="text-center py-8 text-gray-500 dark:text-gray-400">
                No properties available
              </div>
            }
          </div>

          <!-- Footer -->
          <div class="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              (click)="close()"
              class="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [],
})
export class PropertiesModalComponent {
  @Input() isOpen = false;
  @Input() title = 'Properties';
  @Input() properties: PropertyItem[] = [];
  @Output() onClose = new EventEmitter<void>();

  close() {
    this.onClose.emit();
  }
}
