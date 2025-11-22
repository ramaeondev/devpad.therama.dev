import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LogoComponent } from './logo/logo.component';

@Component({
  selector: 'app-changelog-page',
  standalone: true,
  imports: [CommonModule, LogoComponent],
  template: `
    <div class="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center py-10 px-4">
      <app-logo class="mb-6" [isClickable]="true"></app-logo>
      <h1 class="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">Changelog</h1>
      <div class="prose dark:prose-invert max-w-2xl w-full text-sm">
        <ng-container *ngFor="let entry of sortedChangelog()">
          <div class="font-semibold text-blue-700 dark:text-blue-300 mb-2">{{ entry.date }}</div>
          <ul class="mb-4 list-disc pl-6">
            <li *ngFor="let change of entry.changes">{{ change }}</li>
          </ul>
        </ng-container>
      </div>
    </div>
  `,
  styles: [],
})
export class ChangelogPageComponent {
  changelog = signal<{ date: string; changes: string[] }[]>([]);

  sortedChangelog() {
    return [...this.changelog()].sort((a, b) => b.date.localeCompare(a.date));
  }

  constructor() {
    fetch('assets/changelog.json')
      .then(res => res.json())
      .then(data => this.changelog.set(data));
  }
}
