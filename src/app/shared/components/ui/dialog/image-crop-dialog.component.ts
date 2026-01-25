import { Component, EventEmitter, Input, Output, signal } from '@angular/core';

import { ImageCroppedEvent, ImageCropperComponent, LoadedImage } from 'ngx-image-cropper';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-image-crop-dialog',
  standalone: true,
  imports: [ImageCropperComponent],
  template: `
    @if (open) {
      <div
        class="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4"
        aria-modal="true"
        role="dialog"
      >
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" (click)="onCancel()"></div>

        <div
          class="relative bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-lg border-t sm:border border-gray-200 dark:border-gray-800 flex flex-col max-h-[95vh] sm:max-h-[90vh]"
        >
          <!-- Header -->
          <div
            class="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-800"
          >
            <h2 class="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
              Crop Profile Photo
            </h2>
            <button
              class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
              (click)="onCancel()"
              aria-label="Cancel"
            >
              <i class="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>

          <!-- Cropper Area -->
          <div class="flex-1 overflow-y-auto p-4 sm:p-6 touch-pan-y">
            <div
              class="bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden min-h-[300px] sm:min-h-[400px] flex items-center justify-center"
            >
              @if (imageChangedEvent) {
                <image-cropper
                  [imageChangedEvent]="imageChangedEvent"
                  [maintainAspectRatio]="true"
                  [aspectRatio]="1"
                  [roundCropper]="true"
                  [resizeToWidth]="cropSize"
                  [cropperMinWidth]="cropSize"
                  [onlyScaleDown]="true"
                  format="png"
                  [imageQuality]="100"
                  (imageCropped)="imageCropped($event)"
                  (imageLoaded)="imageLoaded()"
                  (cropperReady)="cropperReady()"
                  (loadImageFailed)="loadImageFailed()"
                  style="max-height: 400px; width: 100%;"
                ></image-cropper>
              } @else {
                <div class="text-gray-500 dark:text-gray-400">No image selected</div>
              }
            </div>

            @if (loading()) {
              <div class="mt-4 text-center">
                <div
                  class="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
                >
                  <i class="fa-solid fa-spinner fa-spin text-xs"></i>
                  Loading image...
                </div>
              </div>
            }

            @if (errorMessage()) {
              <div
                class="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
              >
                <p class="text-sm text-red-700 dark:text-red-300">{{ errorMessage() }}</p>
              </div>
            }

            <!-- Tips -->
            <div
              class="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
            >
              <h3 class="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">Tips:</h3>
              <ul class="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                <li>• Drag to reposition your photo</li>
                <li>• Use mouse wheel or pinch to zoom</li>
                <li>• Photo will be cropped to {{ cropSize }}x{{ cropSize }}px</li>
              </ul>
            </div>
          </div>

          <!-- Footer Actions -->
          <div
            class="flex items-center justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-800 safe-bottom"
          >
            <button
              class="px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors touch-manipulation"
              (click)="onCancel()"
            >
              Cancel
            </button>
            <button
              class="px-4 py-2.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation min-w-[100px]"
              [disabled]="!croppedImage() || loading()"
              (click)="onSave()"
            >
              Save Photo
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [],
})
export class ImageCropDialogComponent {
  @Input() open = false;
  @Input() imageChangedEvent: Event | null = null;
  @Input() cropSize = 200; // Default crop size in pixels
  @Output() cancel = new EventEmitter<void>();
  @Output() save = new EventEmitter<Blob>();

  croppedImage = signal<SafeUrl | null>(null);
  croppedBlob = signal<Blob | null>(null);
  loading = signal(true);
  errorMessage = signal('');

  constructor(private sanitizer: DomSanitizer) {
    console.log('ImageCropDialogComponent initialized');
  }

  imageCropped(event: ImageCroppedEvent) {
    console.log('Image cropped:', event);
    if (event.blob) {
      this.croppedBlob.set(event.blob);
      if (event.objectUrl) {
        this.croppedImage.set(this.sanitizer.bypassSecurityTrustUrl(event.objectUrl));
      }
    }
  }

  imageLoaded(image?: LoadedImage) {
    console.log('Image loaded successfully:', image);
    this.loading.set(false);
    this.errorMessage.set('');
  }

  cropperReady() {
    console.log('Cropper ready');
    this.loading.set(false);
  }

  loadImageFailed() {
    console.error('Failed to load image');
    this.loading.set(false);
    this.errorMessage.set('Failed to load image. Please try another file.');
  }

  onCancel() {
    this.resetState();
    this.cancel.emit();
  }

  onSave() {
    const blob = this.croppedBlob();
    if (blob) {
      this.save.emit(blob);
      this.resetState();
    }
  }

  private resetState() {
    this.croppedImage.set(null);
    this.croppedBlob.set(null);
    this.loading.set(true);
    this.errorMessage.set('');
  }
}
