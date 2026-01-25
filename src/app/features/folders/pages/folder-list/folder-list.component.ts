import { Component } from '@angular/core';


@Component({
  selector: 'app-folder-list',
  standalone: true,
  imports: [],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div class="container mx-auto">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-6">Folders</h1>
        <div class="text-center py-12">
          <p class="text-gray-600 dark:text-gray-400">Folder management coming soon...</p>
        </div>
      </div>
    </div>
  `,
})
export class FolderListComponent {}
