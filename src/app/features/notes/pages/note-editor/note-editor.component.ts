import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-note-editor',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div class="container mx-auto">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">Note Editor</h1>
        <p class="text-gray-600 dark:text-gray-400">Editor coming soon...</p>
        <a routerLink="/notes" class="btn btn-secondary mt-4 px-6 py-2">Back to Notes</a>
      </div>
    </div>
  `
})
export class NoteEditorComponent {}
