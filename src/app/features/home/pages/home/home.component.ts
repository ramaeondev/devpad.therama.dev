import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LogoComponent } from '../../../../shared/components/ui/logo/logo.component';
import { IconComponent } from '../../../../shared/components/ui/icon/icon.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, LogoComponent, IconComponent],
  template: `
    <div class="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <header class="px-4 lg:px-6 h-14 flex items-center">
        <a class="flex items-center justify-center" routerLink="/">
          <app-logo></app-logo>
        </a>
        <!-- <nav class="ml-auto flex items-center gap-4 sm:gap-6">
          <a class="text-sm font-medium hover:underline underline-offset-4" routerLink="/policy">
            Privacy Policy
          </a>
          <a class="text-sm font-medium hover:underline underline-offset-4" routerLink="/terms">
            Terms of Service
          </a>
          <a href="https://github.com/ramaeondev/devpad.therama.dev" target="_blank" rel="noopener noreferrer" aria-label="GitHub Repository">
            <app-icon name="github" [size]="24"></app-icon>
          </a>
        </nav> -->
        <nav class="ml-auto flex items-center gap-4 sm:gap-6">
          <a href="https://github.com/ramaeondev/devpad.therama.dev" target="_blank" rel="noopener noreferrer" aria-label="GitHub Repository">
            <app-icon name="github" [size]="24"></app-icon>
          </a>
        </nav>
        
      </header>
      <main class="flex-1">
        <section class="w-full py-12 md:py-24 lg:py-32">
          <div class="container px-4 md:px-6">
            <div class="flex flex-col items-center space-y-6 text-center">
              <div class="space-y-2">
                <h1 class="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  Modern Note-Taking, Simplified
                </h1>
                <p class="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  DevPad is a modern note-taking application built with Angular, Tailwind CSS, and Supabase. It offers a clean, intuitive interface for capturing your ideas.
                </p>
                <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  DevPad is an open source project — view the source on
                  <a href="https://github.com/ramaeondev/devpad.therama.dev" target="_blank" rel="noopener noreferrer" class="font-medium text-primary-600 dark:text-primary-400 hover:underline">GitHub</a>.
                </p>
              </div>
              <div class="space-x-4">
                <a
                  class="inline-flex h-9 items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-gray-50 shadow transition-colors hover:bg-gray-900/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:pointer-events-none disabled:opacity-50 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-50/90 dark:focus-visible:ring-gray-300"
                  routerLink="/auth/login"
                >
                  Get Started
                </a>
              </div>
            </div>
          </div>
        </section>
        <section class="w-full py-12 md:py-24 bg-white dark:bg-gray-800">
          <div class="container px-4 md:px-6">
            <div class="flex flex-col items-center justify-center space-y-4 text-center">
              <div class="space-y-2">
                <div class="inline-block rounded-lg bg-gray-100 px-3 py-1 text-sm dark:bg-gray-700">Key Features</div>
                <h2 class="text-3xl font-bold tracking-tighter sm:text-5xl">Everything You Need to Stay Organized</h2>
                <p class="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                  From markdown editing to cloud integration, DevPad provides a powerful and flexible environment for your notes.
                </p>
              </div>
            </div>
            <div class="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:max-w-none lg:grid-cols-3 mt-12">
              <div class="grid gap-1">
                <h3 class="text-lg font-bold">Markdown Editing</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  Write in a rich-text environment with full markdown support for formatting and code snippets.
                </p>
              </div>
              <div class="grid gap-1">
                <h3 class="text-lg font-bold">Folder Organization</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  Structure your notes with nested folders to keep your workspace tidy and efficient.
                </p>
              </div>
              <div class="grid gap-1">
                <h3 class="text-lg font-bold">Dark/Light Mode</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  Switch between light and dark themes for a comfortable viewing experience, day or night.
                </p>
              </div>
              <div class="grid gap-1">
                <h3 class="text-lg font-bold">Real-time Sync</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  Your notes are saved and synced in real-time across all your devices.
                </p>
              </div>
              <div class="grid gap-1">
                <h3 class="text-lg font-bold">Cloud Storage Integration</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  Connect to Google Drive and OneDrive to manage your notes directly from your cloud storage.
                </p>
              </div>
               <div class="grid gap-1">
                <h3 class="text-lg font-bold">Cross-Platform</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  Access your notes from any device with a modern web browser.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer class="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t dark:border-gray-800">
        <p class="text-xs text-gray-500 dark:text-gray-400">© 2025 DevPad. All rights reserved.</p>
        <nav class="sm:ml-auto flex gap-4 sm:gap-6">
          <a class="text-xs hover:underline underline-offset-4" routerLink="/terms">
            Terms of Service
          </a>
          <a class="text-xs hover:underline underline-offset-4" routerLink="/policy">
            Privacy Policy
          </a>
        </nav>
      </footer>
    </div>
  `,
  styles: [],
})
export class HomeComponent {}

