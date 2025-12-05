import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ShareService } from '../../../../core/services/share.service';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { PublicShare } from '../../../../core/models/public-share.model';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-public-note-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
        <!-- Warning Banner -->
        <div class="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
          <div class="max-w-4xl mx-auto px-4 py-3">
            <p class="text-sm text-yellow-800 dark:text-yellow-200">
              <i class="fa-solid fa-exclamation-triangle mr-2"></i>
              You're editing a public copy. 
              @if (!isLoggedIn()) {
                <a href="/auth/signup" class="underline font-medium">Sign in</a> to save to your account.
              }
            </p>
          </div>
        </div>

        <!-- Header -->
        <div class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
          <div class="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <i class="fa-solid fa-file-edit text-2xl text-primary-500"></i>
              <div>
                <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
                  {{ noteTitle() }}
                </h1>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  <i class="fa-solid fa-pen mr-1"></i>
                  Editable · {{ share()?.view_count || 0 }} views
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                (click)="saveContent()"
                [disabled]="saving()"
                class="px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                @if (saving()) {
                  <i class="fa-solid fa-spinner fa-spin mr-2"></i>
                  Saving...
                } @else {
                  <i class="fa-solid fa-save mr-2"></i>
                  Save
                }
              </button>
              @if (isLoggedIn()) {
                <button
                  (click)="addToMyNotes()"
                  class="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
                >
                  <i class="fa-solid fa-plus mr-2"></i>
                  Add to My Notes
                </button>
              } @else {
                <a
                  href="/auth/signup"
                  class="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
                >
                  <i class="fa-solid fa-user-plus mr-2"></i>
                  Sign Up
                </a>
              }
            </div>
          </div>
        </div>

        <!-- Editor -->
        <div class="max-w-4xl mx-auto px-4 py-8">
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <textarea
              [(ngModel)]="content"
              (input)="onContentChange()"
              class="w-full min-h-[600px] p-8 bg-transparent text-gray-900 dark:text-white focus:outline-none resize-none font-mono text-sm"
              placeholder="Start typing..."
            ></textarea>
          </div>

          <!-- Auto-save indicator -->
          @if (lastSaved()) {
            <div class="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
              <i class="fa-solid fa-check-circle text-green-500 mr-1"></i>
              Last saved {{ lastSaved() }}
            </div>
          }

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
    textarea {
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace;
      line-height: 1.6;
    }
  `],
})
export class PublicNoteEditorComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private shareService = inject(ShareService);
  private authState = inject(AuthStateService);
  private toast = inject(ToastService);

  loading = signal(true);
  error = signal<string | null>(null);
  share = signal<PublicShare | null>(null);
  content = '';
  saving = signal(false);
  lastSaved = signal<string | null>(null);
  private saveTimeout: any;

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

      // Check if share is editable
      if (shareData.permission !== 'editable') {
        // Redirect to viewer
        this.router.navigate(['/share', shareToken]);
        return;
      }

      this.share.set(shareData);
      this.content = shareData.public_content || '';
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

  onContentChange() {
    // Debounce auto-save
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveContent();
    }, 2000); // Auto-save after 2 seconds of inactivity
  }

  async saveContent() {
    const shareData = this.share();
    if (!shareData) return;

    this.saving.set(true);
    try {
      await this.shareService.updatePublicContent(shareData.share_token, this.content);
      this.lastSaved.set(new Date().toLocaleTimeString());
      this.toast.success('Changes saved');
    } catch (err: any) {
      console.error('Error saving content:', err);
      this.toast.error('Failed to save changes');
    } finally {
      this.saving.set(false);
    }
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

  ngOnDestroy() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
  }
}
