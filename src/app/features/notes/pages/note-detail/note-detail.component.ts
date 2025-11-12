import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-note-detail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div class="container mx-auto">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Note Detail</h1>
      </div>
    </div>
  `
})
export class NoteDetailComponent {}
