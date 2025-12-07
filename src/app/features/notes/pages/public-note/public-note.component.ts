import { Component, OnInit, inject, signal, OnDestroy } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ShareService } from '../../../../core/services/share.service';
import { AuthStateService } from '../../../../core/services/auth-state.service';
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
            <a href="/" class="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors inline-block">
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
              <a [href]="'/auth/signin?returnUrl=' + '/share/' + share()?.share_token + '?action=import_and_open'" class="text-xs px-3 py-1.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-800 dark:hover:bg-blue-700 text-blue-800 dark:text-blue-100 rounded-md transition-colors font-medium cursor-pointer">
                Sign In to Save
              </a>
            </div>
          </div>
        } @else if (share()?.permission === 'editable') {
          <!-- Editing Banner -->
          <div class="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
            <div class="max-w-4xl mx-auto px-4 py-3">
              <p class="text-sm text-yellow-800 dark:text-yellow-200">
                <i class="fa-solid fa-exclamation-triangle mr-2"></i>
                You're editing a public copy.
              </p>
            </div>
          </div>
        }

        <!-- Header -->
        <div class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
          <div class="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <i class="fa-solid" [class.fa-file-edit]="canEdit()" [class.fa-file-alt]="!canEdit()" class="text-2xl text-primary-500"></i>
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
                  [disabled]="saving()"
                  class="px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                >
                  @if (saving()) {
                    <i class="fa-solid fa-spinner fa-spin mr-2"></i> Saving...
                  } @else {
                    <i class="fa-solid fa-save mr-2"></i> Save
                  }
                </button>
              }
              
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
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
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
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
              @if (content) {
                <div class="prose dark:prose-invert max-w-none" [innerHTML]="renderedContent()"></div>
              } @else {
                <p class="text-gray-500 dark:text-gray-400 italic">No content available</p>
              }
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
  `]
})
export class PublicNoteComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private shareService = inject(ShareService);
  protected authState = inject(AuthStateService);
  private toast = inject(ToastService);

  loading = signal(true);
  processingRedirect = signal(false);
  error = signal<string | null>(null);
  share = signal<PublicShare | null>(null);
  
  content = '';
  saving = signal(false);
  lastSaved = signal<string | null>(null);
  private saveTimeout: any;
  private refreshInterval: any;

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

    try {
      const shareData = await this.shareService.getShareByToken(shareToken);
      if (!shareData) {
        this.error.set('This share link is invalid or has expired.');
        this.loading.set(false);
        return;
      }

      this.share.set(shareData);
      this.content = shareData.public_content || '';

      // Update Meta Tags
      this.updateMetaTags(shareData);

      // Start periodic refresh for readonly viewers to see updates from the owner
      // (For editable viewers, they'll see updates as they edit)
      if (!this.canEdit()) {
        this.startContentRefresh(shareToken);
      }

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
   */
  private startContentRefresh(shareToken: string) {
    // Refresh every 5 seconds
    this.refreshInterval = setInterval(async () => {
      try {
        const updatedShare = await this.shareService.getShareContentForRefresh(shareToken);
        if (updatedShare && updatedShare.public_content !== this.content) {
          this.content = updatedShare.public_content || '';
        }
      } catch (err) {
        console.error('Error refreshing content:', err);
      }
    }, 5000);
  }

  private updateMetaTags(share: PublicShare) {
    const title = share.note_id || 'Shared Note';
    const description = this.content ? this.content.substring(0, 150).replace(/[#*`]/g, '') + '...' : 'Check out this note on DevPad.';
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

  noteTitle(): string {
    return this.share()?.note_id || 'Shared Note';
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
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
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
    // Logic to add to Public folder handled by dashboard redirect usually,
    // but here we just redirect to dashboard for now.
    this.toast.success('Opened in dashboard');
    this.router.navigate(['/dashboard']);
  }

  private async handleDashboardRedirect(share: PublicShare) {
    const userId = this.authState.userId();
    if (!userId) return;

    // Check if user is owner
    if (share.user_id !== userId) {
      // If no specific action, just stay here
      this.toast.success('Signed in successfully');
      return;
    }

    this.processingRedirect.set(true);
    try {
      const publicFolder = await this.shareService.ensurePublicFolder(userId);
      this.router.navigate(['/dashboard', 'folder', publicFolder.id, 'note', share.note_id], {
        replaceUrl: true
      });
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

    this.processingRedirect.set(true);
    // Show a different loading message if possible, or just generic
    
    try {
      this.toast.info('Importing note to your Public folder...');
      
      // Import the share (fork it)
      const newShare = await this.shareService.importPublicShare(userId, share.share_token);
      
      // Redirect to dashboard with the NEW note
      const publicFolder = await this.shareService.ensurePublicFolder(userId);
      this.router.navigate(['/dashboard', 'folder', publicFolder.id, 'note', newShare.note_id], {
        replaceUrl: true
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
  }
}
