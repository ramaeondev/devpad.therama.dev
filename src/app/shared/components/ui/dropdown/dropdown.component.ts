import { Component, ElementRef, HostListener, Input, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dropdown',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative inline-block" #root>
      <div (click)="toggle()" class="inline-flex" #trigger>
        <ng-content select="[dropdownTrigger]"></ng-content>
      </div>
      @if (open()) {
        <div
          class="absolute z-50 mt-2 min-w-40 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg focus:outline-none"
          [ngClass]="alignmentClass()"
          (click)="onMenuClick($event)"
          #menu
        >
          <div class="py-1">
            <ng-content select="[dropdownMenu]"></ng-content>
          </div>
        </div>
      }
    </div>
  `,
  styles: [``],
})
export class DropdownComponent {
  @Input() align: 'left' | 'right' = 'left';
  open = signal(false);

  @ViewChild('root') rootRef?: ElementRef<HTMLElement>;
  @ViewChild('menu') menuRef?: ElementRef<HTMLElement>;

  toggle() {
    this.open.update((v) => !v);
  }

  close() {
    this.open.set(false);
  }

  alignmentClass() {
    return this.align === 'right' ? 'right-0' : 'left-0';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.open()) return;
    const root = this.rootRef?.nativeElement;
    if (root && !root.contains(event.target as Node)) {
      this.close();
    }
  }

  onMenuClick(event: MouseEvent) {
    // Keep clicks inside from bubbling to document
    event.stopPropagation();
    // Close when a menu item is activated (button, link, or role="menuitem")
    const target = event.target as HTMLElement;
    const actionable = target.closest('button, a, [role="menuitem"]');
    if (actionable) {
      // Defer close to allow any bound click handlers to run first
      setTimeout(() => this.close());
    }
  }
}
