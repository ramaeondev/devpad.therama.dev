import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-note-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div class="container mx-auto">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-6">My Notes</h1>
        <div class="text-center py-12">
          <p class="text-gray-600 dark:text-gray-400 mb-4">No notes yet</p>
          <a routerLink="/notes/new" class="btn btn-primary px-6 py-2">Create First Note</a>
        </div>
      </div>
    </div>
  `,
})
export class NoteListComponent {}
