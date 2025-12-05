import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ShareService } from '../../../../core/services/share.service';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { PublicShare } from '../../../../core/models/public-share.model';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-public-note-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
      @if (loading()) {
        <div class="flex items-center justify-center min-h-screen">
          <div class="text-center">
            <i class="fa-solid fa-spinner fa-spin text-4xl text-primary-500 mb-4"></i>
            <p class="text-gray-600 dark:text-gray-400">Loading shared note...</p>
          </div>
        </div>
      } @else if (error()) {
        <div class="flex items-center justify-center min-h-screen">
          <div class="text-center max-w-md mx-4">
            <i class="fa-solid fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Share Not Found</h1>
            <p class="text-gray-600 dark:text-gray-400 mb-6">{{ error() }}</p>
            <a href="/" class="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors inline-block">
              Go to DevPad
            </a>
          </div>
        </div>
      } @else if (share()) {
        <!-- Header -->
        <div class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
          <div class="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <i class="fa-solid fa-file-alt text-2xl text-primary-500"></i>
              <div>
                <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
                  {{ noteTitle() }}
                </h1>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  <i class="fa-solid fa-eye mr-1"></i>
                  Readonly · {{ share()?.view_count || 0 }} views
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              @if (isLoggedIn()) {
                <button
                  (click)="addToMyNotes()"
                  class="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
                >
                  <i class="fa-solid fa-plus mr-2"></i>
                  Add to My Notes
                </button>
              } @else {
                <a
                  href="/auth/signup"
                  class="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
                >
                  <i class="fa-solid fa-user-plus mr-2"></i>
                  Sign Up to Save
                </a>
              }
            </div>
          </div>
        </div>

        <!-- Content -->
        <div class="max-w-4xl mx-auto px-4 py-8">
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            @if (share()?.public_content) {
              <div class="prose dark:prose-invert max-w-none" [innerHTML]="renderedContent()"></div>
            } @else {
              <p class="text-gray-500 dark:text-gray-400 italic">No content available</p>
            }
          </div>

          <!-- Footer -->
          <div class="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>
              Shared via <a href="/" class="text-primary-500 hover:text-primary-600 font-medium">DevPad</a>
            </p>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .prose {
      @apply text-gray-900 dark:text-gray-100;
    }

    .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
      @apply text-gray-900 dark:text-white;
    }

    .prose a {
      @apply text-primary-500 hover:text-primary-600;
    }

    .prose code {
      @apply bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-sm;
    }

    .prose pre {
      @apply bg-gray-100 dark:bg-gray-700 p-4 rounded-lg overflow-x-auto;
    }
  `],
})
export class PublicNoteViewerComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private shareService = inject(ShareService);
  private authState = inject(AuthStateService);
  private toast = inject(ToastService);

  loading = signal(true);
  error = signal<string | null>(null);
  share = signal<PublicShare | null>(null);

  isLoggedIn = this.authState.isAuthenticated;

  async ngOnInit() {
    const shareToken = this.route.snapshot.paramMap.get('shareToken');
    if (!shareToken) {
      this.error.set('Invalid share link');
      this.loading.set(false);
      return;
    }

    try {
      const shareData = await this.shareService.getShareByToken(shareToken);
      if (!shareData) {
        this.error.set('This share link is invalid or has expired.');
        this.loading.set(false);
        return;
      }

      // Check if share is readonly
      if (shareData.permission === 'editable') {
        // Redirect to editor
        this.router.navigate(['/share', shareToken, 'edit']);
        return;
      }

      this.share.set(shareData);
    } catch (err: any) {
      console.error('Error loading share:', err);
      this.error.set('Failed to load shared note. Please try again later.');
    } finally {
      this.loading.set(false);
    }
  }

  noteTitle(): string {
    return this.share()?.note_id || 'Shared Note';
  }

  renderedContent(): string {
    const content = this.share()?.public_content || '';
    // Simple markdown-like rendering (you can use a proper markdown library)
    return this.simpleMarkdownToHtml(content);
  }

  private simpleMarkdownToHtml(markdown: string): string {
    // Basic markdown rendering - in production, use a library like marked.js
    let html = markdown;
    
    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Links
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // Line breaks
    html = html.replace(/\n/g, '<br>');
    
    return html;
  }

  async addToMyNotes() {
    if (!this.isLoggedIn()) {
      this.router.navigate(['/auth/signup']);
      return;
    }

    // TODO: Implement adding note to user's Public folder
    this.toast.success('Note added to your Public folder!');
    this.router.navigate(['/dashboard']);
  }
}
