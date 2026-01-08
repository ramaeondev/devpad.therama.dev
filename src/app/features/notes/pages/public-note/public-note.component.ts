import { Component, OnInit, inject, signal, OnDestroy } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ShareService } from '../../../../core/services/share.service';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { PublicShare } from '../../../../core/models/public-share.model';
import { ToastService } from '../../../../core/services/toast.service';
import { LogoComponent } from '../../../../shared/components/ui/logo/logo.component';

@Component({
  selector: 'app-public-note',
  standalone: true,
  imports: [CommonModule, FormsModule, LogoComponent],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
      @if (processingRedirect()) {
        <div class="flex items-center justify-center min-h-screen">
          <div class="text-center">
            <i class="fa-solid fa-sync fa-spin text-4xl text-primary-500 mb-4"></i>
            <p class="text-gray-600 dark:text-gray-400">Setting up your dashboard...</p>
          </div>
        </div>
      } @else if (loading()) {
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
            <a
              href="/"
              class="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors inline-block"
            >
              Go to DevPad
            </a>
          </div>
        </div>
      } @else if (share()) {
        <!-- Brand Header -->
        <div class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div class="max-w-4xl mx-auto px-4 py-4">
            <app-logo [isClickable]="true"></app-logo>
          </div>
        </div>

        <!-- Warning Banner for Anonymous Users trying to Edit -->
        @if (!isLoggedIn() && share()?.permission === 'editable') {
          <div class="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
            <div class="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
              <p class="text-sm text-blue-800 dark:text-blue-200">
                <i class="fa-solid fa-lock mr-2"></i>
                Sign in to edit this shared note.
              </p>
              <a
                [href]="'/auth/signin?returnUrl=' + '/share/' + share()?.share_token"
                class="text-xs px-3 py-1.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-800 dark:hover:bg-blue-700 text-blue-800 dark:text-blue-100 rounded-md transition-colors font-medium cursor-pointer"
              >
                Sign In
              </a>
            </div>
          </div>
        } @else if (share()?.permission === 'editable') {
          <!-- Editing Banner -->
          <div
            class="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800"
          >
            <div class="max-w-4xl mx-auto px-4 py-3">
              <p class="text-sm text-yellow-800 dark:text-yellow-200">
                <i class="fa-solid fa-users-edit mr-2"></i>
                @if (isOwner()) {
                  You're viewing your shared note. Anyone with this link can edit.
                } @else {
                  You're editing a shared note. Changes are visible to everyone.
                }
              </p>
            </div>
          </div>
        }

        <!-- Header -->
        <div
          class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10"
        >
          <div class="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <i
                class="fa-solid"
                [class.fa-file-edit]="canEdit()"
                [class.fa-file-alt]="!canEdit()"
                class="text-2xl text-primary-500"
              ></i>
              <div>
                <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
                  {{ noteTitle() }}
                </h1>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  @if (canEdit()) {
                    <i class="fa-solid fa-pen mr-1"></i> Editable
                  } @else {
                    <i class="fa-solid fa-eye mr-1"></i> Readonly
                  }
                  · {{ share()?.view_count || 0 }} views
                  @if (share()?.unique_view_count) {
                    · {{ share()?.unique_view_count }} unique
                  }
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2">
              @if (canEdit()) {
                <button
                  (click)="saveContent()"
                  [disabled]="saving() || forking()"
                  class="px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                >
                  @if (saving()) {
                    <i class="fa-solid fa-spinner fa-spin mr-2"></i> Saving...
                  } @else {
                    <i class="fa-solid fa-save mr-2"></i> Save
                  }
                </button>
              }

              <!-- Owner can open in dashboard for full editor -->
              @if (isOwner()) {
                <button
                  (click)="openInDashboard()"
                  class="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
                >
                  <i class="fa-solid fa-external-link-alt mr-2"></i>
                  Open in Dashboard
                </button>
              }

              <!-- Show "Add to My Notes" for non-owners -->
              @if (!isOwner() && isLoggedIn()) {
                <button
                  (click)="importToMyNotes()"
                  [disabled]="forking() || saving()"
                  class="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  @if (forking()) {
                    <i class="fa-solid fa-spinner fa-spin mr-2"></i> Importing...
                  } @else {
                    <i class="fa-solid fa-copy mr-2"></i>
                    @if (share()?.permission === 'editable') {
                      Fork to My Notes
                    } @else {
                      Add to My Notes
                    }
                  }
                </button>
              }
              @if (!isOwner() && !isLoggedIn() && share()?.permission === 'readonly') {
                <a
                  [href]="'/auth/signup'"
                  class="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
                >
                  <i class="fa-solid fa-user-plus mr-2"></i>
                  Sign Up
                </a>
              }
            </div>
          </div>
        </div>

        <!-- Main Content Area -->
        <div class="max-w-4xl mx-auto px-4 py-8">
          @if (canEdit()) {
            <!-- Editor Mode -->
            <div
              class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <textarea
                [(ngModel)]="content"
                (input)="onContentChange()"
                class="w-full min-h-[600px] p-8 bg-transparent text-gray-900 dark:text-white focus:outline-none resize-none font-mono text-sm hidden-scrollbar"
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
          } @else {
            <!-- Viewer Mode (Rendered) -->
            <div
              class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8"
            >
              @if (content) {
                <div
                  class="prose dark:prose-invert max-w-none"
                  [innerHTML]="renderedContent()"
                ></div>
              } @else {
                <p class="text-gray-500 dark:text-gray-400 italic">No content available</p>
              }
            </div>
          }

          <!-- Footer -->
          <div class="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>
              Shared via
              <a href="/" class="text-primary-500 hover:text-primary-600 font-medium">DevPad</a>
            </p>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      textarea {
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace;
        line-height: 1.6;
      }
      .prose {
        @apply text-gray-900 dark:text-gray-100;
      }
      .prose h1,
      .prose h2,
      .prose h3,
      .prose h4,
      .prose h5,
      .prose h6 {
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
    `,
  ],
})
export class PublicNoteComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private shareService = inject(ShareService);
  protected authState = inject(AuthStateService);
  private toast = inject(ToastService);
  private supabase = inject(SupabaseService);

  loading = signal(true);
  processingRedirect = signal(false);
  error = signal<string | null>(null);
  share = signal<PublicShare | null>(null);
  isEncrypted = signal(false);
  requiresEncryptionKey = signal(false);

  content = '';
  saving = signal(false);
  forking = signal(false);
  lastSaved = signal<string | null>(null);
  private saveTimeout: any;
  private refreshInterval: any;
  private refreshStartTime = 0;
  private readonly MAX_REFRESH_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly REFRESH_INTERVAL = 30000; // 30 seconds (reduced from 5)
  private visibilityHandler: (() => void) | null = null;

  // Make isAuthenticated signal accessible in template
  isLoggedIn = this.authState.isAuthenticated;
  private titleService = inject(Title);
  private metaService = inject(Meta);

  async ngOnInit() {
    const shareToken = this.route.snapshot.paramMap.get('shareToken');
    if (!shareToken) {
      this.error.set('Invalid share link');
      this.loading.set(false);
      return;
    }

    // Initialize Supabase client to detect current session
    // This ensures isAuthenticated signal is updated before we check permissions
    await this.supabase.getSession();

    try {
      const shareData = await this.shareService.getShareByToken(shareToken);
      if (!shareData) {
        this.error.set('This share link is invalid or has expired.');
        this.loading.set(false);
        return;
      }

      this.share.set(shareData);
      // Content is fetched dynamically via RPC (property 'content' added in-memory by share service)
      // This ensures we always have the latest note.content from the source
      this.content = (shareData as any).content || '';

      // Track encryption status for UI
      this.isEncrypted.set((shareData as any).isEncrypted || false);
      this.requiresEncryptionKey.set((shareData as any).requiresEncryptionKey || false);

      // Update Meta Tags
      this.updateMetaTags(shareData);

      // Start periodic refresh for ALL viewers to see updates
      // - Readonly viewers see updates from the owner
      // - Editable viewers see updates from other remote users editing the same share
      this.startContentRefresh(shareToken);

      // Handle post-login redirect action
      const action = this.route.snapshot.queryParamMap.get('action');
      if (this.isLoggedIn()) {
        if (action === 'open_in_dashboard') {
          await this.handleDashboardRedirect(shareData);
        } else if (action === 'import_and_open') {
          await this.handleImportAndOpen(shareData);
        }
      }
    } catch (err: any) {
      console.error('Error loading share:', err);
      this.error.set('Failed to load shared note. Please try again later.');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Start periodic refresh of content for readonly viewers
   * This allows viewers to see updates made by the note owner
   * Uses a separate endpoint that doesn't increment view counts
   *
   * Optimizations:
   * - Polls every 30 seconds (reduced from 5 for better performance)
   * - Automatically stops after 5 minutes of viewing
   * - Pauses when tab is not visible
   */
  private startContentRefresh(shareToken: string) {
    this.refreshStartTime = Date.now();

    // Set up visibility change listener to pause/resume polling
    this.visibilityHandler = () => {
      if (document.hidden) {
        // Pause polling when tab is hidden
        if (this.refreshInterval) {
          clearInterval(this.refreshInterval);
          this.refreshInterval = null;
        }
      } else {
        // Resume polling when tab becomes visible (if not expired)
        const elapsed = Date.now() - this.refreshStartTime;
        if (!this.refreshInterval && elapsed < this.MAX_REFRESH_DURATION) {
          this.startPolling(shareToken);
        }
      }
    };

    document.addEventListener('visibilitychange', this.visibilityHandler);

    // Start the polling
    this.startPolling(shareToken);
  }

  private startPolling(shareToken: string) {
    this.refreshInterval = setInterval(async () => {
      // Stop refreshing after max duration
      const elapsed = Date.now() - this.refreshStartTime;
      if (elapsed >= this.MAX_REFRESH_DURATION) {
        if (this.refreshInterval) {
          clearInterval(this.refreshInterval);
          this.refreshInterval = null;
        }
        console.log('Auto-refresh stopped after 5 minutes of viewing');
        return;
      }

      try {
        const updatedShare = await this.shareService.getShareContentForRefresh(shareToken);
        // Content is fetched via RPC and stored in-memory as 'content' property
        const updatedContent = (updatedShare as any).content || '';
        if (updatedShare && updatedContent !== this.content) {
          this.content = updatedContent;
          // Update encryption status in case it changed
          this.isEncrypted.set((updatedShare as any).isEncrypted || false);
          this.requiresEncryptionKey.set((updatedShare as any).requiresEncryptionKey || false);
          console.log('Content refreshed with latest changes');
        }
      } catch (err) {
        console.error('Error refreshing content:', err);
      }
    }, this.REFRESH_INTERVAL);
  }

  private updateMetaTags(share: PublicShare) {
    const title = share.note_title || 'Shared Note';
    const description = this.content
      ? this.content.substring(0, 150).replace(/[#*`]/g, '') + '...'
      : 'Check out this note on DevPad.';
    const url = window.location.href;
    const imageUrl = '/og_image.jpg'; // Default image

    this.titleService.setTitle(`${title} - DevPad`);

    this.metaService.updateTag({ property: 'og:title', content: title });
    this.metaService.updateTag({ property: 'og:description', content: description });
    this.metaService.updateTag({ property: 'og:image', content: imageUrl });
    this.metaService.updateTag({ property: 'og:url', content: url });
    this.metaService.updateTag({ property: 'og:type', content: 'article' });

    this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:title', content: title });
    this.metaService.updateTag({ name: 'twitter:description', content: description });
    this.metaService.updateTag({ name: 'twitter:image', content: imageUrl });
  }

  // Determine if the current user can edit the note
  canEdit(): boolean {
    const share = this.share();
    return !!(this.isLoggedIn() && share?.permission === 'editable');
  }

  // Determine if the current user is the original author (share owner)
  isOwner(): boolean {
    const share = this.share();
    const userId = this.authState.userId();
    return !!(userId && share?.user_id === userId);
  }

  noteTitle(): string {
    return this.share()?.note_title || 'Shared Note';
  }

  // Formatting for Viewer Mode
  renderedContent(): string {
    return this.simpleMarkdownToHtml(this.content);
  }

  private simpleMarkdownToHtml(markdown: string): string {
    // Basic markdown rendering
    let html = markdown || '';
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(
      /\[(.*?)\]\((.*?)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
    );
    html = html.replace(/\n/g, '<br>');
    return html;
  }

  // Editor Actions
  onContentChange() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => this.saveContent(), 2000);
  }

  async saveContent() {
    const shareData = this.share();
    if (!shareData || !this.canEdit()) return;

    // IMPORTANT: Encrypted shared notes limitation
    // If the note is encrypted, only the owner (with the encryption key) can decrypt/view the content
    // Non-owner edits to encrypted shares are saved as encrypted text (not re-encrypted by viewers)
    // This is by design - encryption is owner-only. To share decrypted content, owner must:
    // 1. Decrypt the note in their dashboard (requires their encryption key)
    // 2. Re-share the decrypted copy, OR
    // 3. Disable encryption before sharing

    this.saving.set(true);
    try {
      await this.shareService.updatePublicContent(shareData.share_token, this.content);
      this.lastSaved.set(new Date().toLocaleTimeString());

      // If owner is editing, move note to Public folder and open in dashboard
      if (this.isOwner()) {
        this.toast.success('Changes saved! Opening in dashboard...');
        const userId = this.authState.userId();
        if (userId) {
          const publicFolder = await this.shareService.ensurePublicFolder(userId);
          this.router.navigate([
            '/dashboard',
            'folder',
            publicFolder.id,
            'note',
            shareData.note_id,
          ]);
        }
      } else {
        this.toast.success('Changes saved');
      }
    } catch (err: any) {
      console.error('Error saving content:', err);
      this.toast.error('Failed to save changes');
    } finally {
      this.saving.set(false);
    }
  }

  async openInDashboard() {
    const share = this.share();
    if (!share || !this.isOwner()) return;

    try {
      const publicFolder = await this.shareService.ensurePublicFolder(share.user_id);
      this.router.navigate(['/dashboard', 'folder', publicFolder.id, 'note', share.note_id]);
    } catch (error) {
      console.error('Failed to open in dashboard:', error);
      this.toast.error('Failed to open note in dashboard');
    }
  }

  async importToMyNotes() {
    if (!this.isLoggedIn()) {
      this.router.navigate(['/auth/signup']);
      return;
    }

    const share = this.share();
    const userId = this.authState.userId();
    if (!share || !userId) return;

    this.forking.set(true);
    try {
      this.toast.info('Forking note to your account...');

      // Import the share (creates a copy in user's Imports folder)
      const newShare = await this.shareService.importPublicShare(userId, share.share_token);

      // Redirect to the imported note in Imports folder
      const importsFolder = await this.shareService.ensureImportsFolder(userId);
      this.toast.success('Note forked successfully! Opening in dashboard...');
      this.router.navigate(['/dashboard', 'folder', importsFolder.id, 'note', newShare.note_id]);
    } catch (error) {
      console.error('Failed to fork note:', error);
      this.toast.error('Failed to fork note');
      this.forking.set(false);
    }
    // Don't set forking to false on success - we're navigating away
  }

  private async handleDashboardRedirect(share: PublicShare) {
    const userId = this.authState.userId();
    if (!userId) return;

    this.processingRedirect.set(true);
    try {
      // For editable shares, all users should edit the same note in their dashboard
      // For readonly shares, only owner can open directly
      if (share.permission === 'editable' || share.user_id === userId) {
        // Get the owner's public folder (where the note actually exists)
        const publicFolder = await this.shareService.ensurePublicFolder(share.user_id);
        this.router.navigate(['/dashboard', 'folder', publicFolder.id, 'note', share.note_id], {
          replaceUrl: true,
        });
      } else {
        // Non-owner viewing readonly share - stay on public page
        this.toast.success('Signed in successfully');
        this.processingRedirect.set(false);
      }
    } catch (error) {
      console.error('Redirect failed:', error);
      this.toast.error('Failed to open note in dashboard');
      this.processingRedirect.set(false);
    }
  }

  private async handleImportAndOpen(share: PublicShare) {
    const userId = this.authState.userId();
    if (!userId) return;

    // If user is owner, just redirect to dashboard
    if (share.user_id === userId) {
      await this.handleDashboardRedirect(share);
      return;
    }

    // Editable shares cannot be imported - they are always shared
    // Only the original author can control share settings
    if (share.permission === 'editable') {
      this.toast.error(
        'Editable shares cannot be imported. This shared note is already public with edit access.',
      );
      this.processingRedirect.set(false);
      return;
    }

    this.processingRedirect.set(true);
    // Show a different loading message if possible, or just generic

    try {
      this.toast.info('Importing note to your Public folder...');

      // Import the share (fork it) - only for readonly shares
      const newShare = await this.shareService.importPublicShare(userId, share.share_token);

      // Redirect to dashboard with the NEW note
      const publicFolder = await this.shareService.ensurePublicFolder(userId);
      this.router.navigate(['/dashboard', 'folder', publicFolder.id, 'note', newShare.note_id], {
        replaceUrl: true,
      });
      this.toast.success('Note imported successfully');
    } catch (error) {
      console.error('Import failed:', error);
      this.toast.error('Failed to import note');
      this.processingRedirect.set(false);
    }
  }

  ngOnDestroy() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    if (this.refreshInterval) clearInterval(this.refreshInterval);

    // Clean up visibility change listener
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }
  }
}
