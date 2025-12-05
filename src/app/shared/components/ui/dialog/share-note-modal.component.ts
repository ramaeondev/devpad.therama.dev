import { Component, Input, Output, EventEmitter, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShareService } from '../../../../core/services/share.service';
import { ToastService } from '../../../../core/services/toast.service';
import { PublicShare } from '../../../../core/models/public-share.model';

@Component({
  selector: 'app-share-note-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" (click)="onOverlayClick($event)">
      <div class="modal-content bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="modal-header flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            {{ existingShare() ? 'Manage Share' : 'Share Note' }}
          </h2>
          <button
            (click)="cancel.emit()"
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <i class="fa-solid fa-times text-xl"></i>
          </button>
        </div>

        <!-- Body -->
        <div class="modal-body p-6 space-y-4">
          @if (loading()) {
            <div class="text-center py-8">
              <i class="fa-solid fa-spinner fa-spin text-3xl text-primary-500"></i>
              <p class="mt-2 text-gray-600 dark:text-gray-400">Loading...</p>
            </div>
          } @else if (existingShare()) {
            <!-- Existing share -->
            <div class="space-y-4">
              <!-- Share URL -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Share Link
                </label>
                <div class="flex gap-2">
                  <input
                    type="text"
                    [value]="shareUrl()"
                    readonly
                    class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                  <button
                    (click)="copyLink()"
                    class="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
                    [disabled]="copied()"
                  >
                    <i class="fa-solid" [ngClass]="copied() ? 'fa-check' : 'fa-copy'"></i>
                  </button>
                </div>
              </div>

              <!-- Permission -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Permission
                </label>
                <div class="space-y-2">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="permission"
                      value="readonly"
                      [(ngModel)]="permission"
                      (change)="onPermissionChange()"
                      class="text-primary-500 focus:ring-primary-500"
                    />
                    <span class="text-sm text-gray-700 dark:text-gray-300">
                      <i class="fa-solid fa-eye mr-1"></i>
                      Readonly - Others can view only
                    </span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="permission"
                      value="editable"
                      [(ngModel)]="permission"
                      (change)="onPermissionChange()"
                      class="text-primary-500 focus:ring-primary-500"
                    />
                    <span class="text-sm text-gray-700 dark:text-gray-300">
                      <i class="fa-solid fa-pen mr-1"></i>
                      Editable - Others can edit
                    </span>
                  </label>
                </div>
              </div>

              <!-- Social Share Buttons -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Share via
                </label>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    (click)="shareViaWhatsApp()"
                    class="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <i class="fa-brands fa-whatsapp"></i>
                    WhatsApp
                  </button>
                  <button
                    (click)="shareViaTwitter()"
                    class="px-4 py-2 bg-blue-400 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <i class="fa-brands fa-twitter"></i>
                    Twitter
                  </button>
                  <button
                    (click)="shareViaFacebook()"
                    class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <i class="fa-brands fa-facebook"></i>
                    Facebook
                  </button>
                  <button
                    (click)="copyForInstagram()"
                    class="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <i class="fa-brands fa-instagram"></i>
                    Instagram
                  </button>
                </div>
              </div>

              <!-- Stats -->
              <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div class="flex items-center justify-between text-sm">
                  <span class="text-gray-600 dark:text-gray-400">Views</span>
                  <span class="font-semibold text-gray-900 dark:text-white">{{ existingShare()?.view_count || 0 }}</span>
                </div>
              </div>

              <!-- Unshare Button -->
              <button
                (click)="unshare()"
                class="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                <i class="fa-solid fa-trash mr-2"></i>
                Unshare
              </button>
            </div>
          } @else {
            <!-- Create new share -->
            <div class="space-y-4">
              <p class="text-sm text-gray-600 dark:text-gray-400">
                Create a shareable link for "<strong>{{ note?.title || 'Untitled' }}</strong>"
              </p>

              <!-- Permission Selection -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Permission
                </label>
                <div class="space-y-2">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="permission"
                      value="readonly"
                      [(ngModel)]="permission"
                      class="text-primary-500 focus:ring-primary-500"
                    />
                    <span class="text-sm text-gray-700 dark:text-gray-300">
                      <i class="fa-solid fa-eye mr-1"></i>
                      Readonly - Others can view only
                    </span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="permission"
                      value="editable"
                      [(ngModel)]="permission"
                      class="text-primary-500 focus:ring-primary-500"
                    />
                    <span class="text-sm text-gray-700 dark:text-gray-300">
                      <i class="fa-solid fa-pen mr-1"></i>
                      Editable - Others can edit
                    </span>
                  </label>
                </div>
              </div>

              <!-- Warning -->
              <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p class="text-xs text-yellow-800 dark:text-yellow-200">
                  <i class="fa-solid fa-exclamation-triangle mr-1"></i>
                  Shared content will be publicly accessible. Anyone with the link can access it.
                </p>
              </div>

              <!-- Create Button -->
              <button
                (click)="createShare()"
                class="w-full px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
              >
                <i class="fa-solid fa-share-nodes mr-2"></i>
                Create Share Link
              </button>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      animation: fadeIn 0.2s ease-out;
    }

    .modal-content {
      animation: slideUp 0.3s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `],
})
export class ShareNoteModalComponent implements OnInit {
  @Input() note: any;
  @Output() cancel = new EventEmitter<void>();
  @Output() shared = new EventEmitter<PublicShare>();

  private shareService = inject(ShareService);
  private toast = inject(ToastService);

  loading = signal(false);
  existingShare = signal<PublicShare | null>(null);
  permission: 'readonly' | 'editable' = 'readonly';
  copied = signal(false);

  async ngOnInit() {
    if (!this.note) return;

    // Check if note already has a share
    this.loading.set(true);
    try {
      const shares = await this.shareService.getSharesForNote(this.note.id);
      if (shares.length > 0) {
        this.existingShare.set(shares[0]);
        this.permission = shares[0].permission;
      }
    } catch (error: any) {
      console.error('Error loading shares:', error);
    } finally {
      this.loading.set(false);
    }
  }

  shareUrl(): string {
    const share = this.existingShare();
    if (!share) return '';
    return this.shareService.generateShareUrl(share.share_token);
  }

  async createShare() {
    if (!this.note) return;

    this.loading.set(true);
    try {
      const share = await this.shareService.createShare(this.note.id, this.permission);
      this.existingShare.set(share);
      this.toast.success('Share link created!');
      this.shared.emit(share);
    } catch (error: any) {
      console.error('Error creating share:', error);
      this.toast.error(error.message || 'Failed to create share');
    } finally {
      this.loading.set(false);
    }
  }

  async onPermissionChange() {
    const share = this.existingShare();
    if (!share) return;

    try {
      await this.shareService.updateSharePermission(share.id, this.permission);
      this.toast.success('Permission updated');
      // Update local state
      this.existingShare.set({ ...share, permission: this.permission });
    } catch (error: any) {
      console.error('Error updating permission:', error);
      this.toast.error('Failed to update permission');
    }
  }

  async unshare() {
    const share = this.existingShare();
    if (!share) return;

    this.loading.set(true);
    try {
      await this.shareService.deleteShare(share.id);
      this.toast.success('Share removed');
      this.cancel.emit();
    } catch (error: any) {
      console.error('Error removing share:', error);
      this.toast.error('Failed to remove share');
    } finally {
      this.loading.set(false);
    }
  }

  copyLink() {
    const url = this.shareUrl();
    navigator.clipboard.writeText(url).then(() => {
      this.copied.set(true);
      this.toast.success('Link copied!');
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  shareViaWhatsApp() {
    const url = this.shareUrl();
    const text = `Check out this note: ${this.note?.title || 'Untitled'}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`, '_blank');
  }

  shareViaTwitter() {
    const url = this.shareUrl();
    const text = this.note?.title || 'Check out this note';
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
  }

  shareViaFacebook() {
    const url = this.shareUrl();
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
  }

  copyForInstagram() {
    this.copyLink();
    this.toast.success('Link copied! Paste it in your Instagram bio or story.');
  }

  onOverlayClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.cancel.emit();
    }
  }
}
