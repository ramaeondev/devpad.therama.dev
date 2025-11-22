import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LogoComponent } from './logo/logo.component';

@Component({
  selector: 'app-changelog-modal',
  standalone: true,
  imports: [CommonModule, LogoComponent],
  template: `
    <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" (click)="close()">
      <div class="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full mx-4 overflow-auto max-h-[90vh] p-6 relative" (click)="$event.stopPropagation()">
        <div class="flex flex-col items-center mb-4">
          <app-logo></app-logo>
        </div>
        <h2 class="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Changelog</h2>
        <div class="prose dark:prose-invert max-w-none text-sm">
          <ng-container *ngFor="let entry of sortedChangelog()">
            <div class="font-semibold text-blue-700 dark:text-blue-300 mb-2">{{ entry.date }}</div>
            <ul class="mb-4 list-disc pl-6">
              <li *ngFor="let change of entry.changes">{{ change }}</li>
            </ul>
          </ng-container>
        </div>
        <button class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300" (click)="close()" aria-label="Close">
          <i class="fa-solid fa-xmark text-lg"></i>
        </button>
      </div>
    </div>
  `,
  styles: [],
})
export class ChangelogModalComponent {
  changelog = signal<{ date: string; changes: string[] }[]>([]);
  show = signal(false);

  sortedChangelog() {
    return [...this.changelog()].sort((a, b) => b.date.localeCompare(a.date));
  }

  constructor() {
    fetch('assets/changelog.json')
      .then(res => res.json())
      .then(data => this.changelog.set(data));
  }

  close() {
    this.show.set(false);
  }
}
