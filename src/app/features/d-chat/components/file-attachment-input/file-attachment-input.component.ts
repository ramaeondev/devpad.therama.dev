import { Component, Output, EventEmitter, ViewChild, ElementRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileAttachmentService } from '../../services/file-attachment.service';
import { FileMetadata } from '../../models/file-attachment.model';

@Component({
  selector: 'app-file-attachment-input',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="file-input-container">
      <!-- Hidden file input -->
      <input
        #fileInput
        type="file"
        multiple
        class="hidden-input"
        (change)="onFileSelected($event)"
        [disabled]="isLoading()"
      />

      <!-- Drag and drop area -->
      <div 
        class="drop-zone"
        [class.dragging]="isDragging()"
        [class.loading]="isLoading()"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
        (click)="triggerFileInput()"
      >
        <div class="drop-icon">📁</div>
        <p class="drop-text">
          <span *ngIf="!isLoading()">{{ isDragging() ? 'Drop files here' : 'Click or drag files to attach' }}</span>
          <span *ngIf="isLoading()">Processing files...</span>
        </p>
        <p class="drop-hint">Files up to {{ maxSizeLabel }} • Any file type</p>

        <!-- Loading indicator -->
        <div *ngIf="isLoading()" class="loading-spinner">
          <div class="spinner"></div>
        </div>
      </div>

      <!-- Error message -->
      <div *ngIf="error()" class="error-message">
        {{ error() }}
      </div>

      <!-- Selected files preview -->
      <div *ngIf="selectedFiles().length > 0" class="selected-files">
        <p class="selected-title">Selected Files ({{ selectedFiles().length }})</p>
        <div class="file-list">
          <div *ngFor="let file of selectedFiles()" class="file-item">
            <span class="file-icon">{{ getFileIcon(file.name) }}</span>
            <span class="file-info">
              <span class="file-name">{{ truncateFileName(file.name, 25) }}</span>
              <span class="file-size">{{ formatFileSize(file.size) }}</span>
            </span>
            <button 
              type="button"
              class="remove-btn"
              (click)="removeFile(file.name)"
              title="Remove file"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- Action buttons -->
        <div class="action-buttons">
          <button 
            type="button"
            class="btn btn-secondary"
            (click)="clearFiles()"
            [disabled]="isLoading()"
          >
            Clear All
          </button>
          <button 
            type="button"
            class="btn btn-primary"
            (click)="submitFiles()"
            [disabled]="isLoading() || selectedFiles().length === 0"
          >
            Attach {{ selectedFiles().length }} {{ selectedFiles().length === 1 ? 'File' : 'Files' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .file-input-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .hidden-input {
      display: none;
    }

    .drop-zone {
      position: relative;
      padding: 24px;
      border: 2px dashed rgba(0, 255, 0, 0.4);
      border-radius: 8px;
      background: linear-gradient(135deg, rgba(0, 255, 0, 0.03) 0%, rgba(0, 128, 0, 0.03) 100%);
      cursor: pointer;
      transition: all 0.3s ease;
      text-align: center;

      &:hover {
        border-color: rgba(0, 255, 0, 0.6);
        background: linear-gradient(135deg, rgba(0, 255, 0, 0.08) 0%, rgba(0, 128, 0, 0.08) 100%);
      }

      &.dragging {
        border-color: rgba(0, 255, 0, 0.8);
        background: linear-gradient(135deg, rgba(0, 255, 0, 0.12) 0%, rgba(0, 128, 0, 0.12) 100%);
        box-shadow: 0 0 16px rgba(0, 255, 0, 0.3);
      }

      &.loading {
        cursor: not-allowed;
        opacity: 0.7;
      }
    }

    .drop-icon {
      font-size: 40px;
      margin-bottom: 8px;
      animation: bounce 2s infinite;
    }

    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-4px); }
    }

    .drop-text {
      margin: 0 0 4px;
      font-size: 14px;
      font-weight: 500;
      color: rgba(0, 255, 0, 0.8);
      font-family: 'Courier New', monospace;
    }

    .drop-hint {
      margin: 0;
      font-size: 12px;
      color: rgba(0, 255, 0, 0.5);
      font-family: 'Courier New', monospace;
    }

    .loading-spinner {
      margin-top: 12px;
      display: flex;
      justify-content: center;
    }

    .spinner {
      width: 24px;
      height: 24px;
      border: 2px solid rgba(0, 255, 0, 0.2);
      border-top-color: rgba(0, 255, 0, 0.8);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-message {
      padding: 10px 12px;
      background: rgba(255, 0, 0, 0.1);
      border: 1px solid rgba(255, 0, 0, 0.3);
      border-radius: 6px;
      color: rgba(255, 0, 0, 0.8);
      font-size: 12px;
      font-family: 'Courier New', monospace;
      line-height: 1.4;
    }

    .selected-files {
      padding: 12px;
      background: linear-gradient(135deg, rgba(0, 255, 0, 0.05) 0%, rgba(0, 128, 0, 0.05) 100%);
      border: 1px solid rgba(0, 255, 0, 0.2);
      border-radius: 6px;
    }

    .selected-title {
      margin: 0 0 8px;
      font-size: 12px;
      font-weight: 600;
      color: rgba(0, 255, 0, 0.7);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .file-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 12px;
      max-height: 200px;
      overflow-y: auto;

      &::-webkit-scrollbar {
        width: 6px;
      }

      &::-webkit-scrollbar-track {
        background: rgba(0, 255, 0, 0.05);
        border-radius: 3px;
      }

      &::-webkit-scrollbar-thumb {
        background: rgba(0, 255, 0, 0.3);
        border-radius: 3px;

        &:hover {
          background: rgba(0, 255, 0, 0.5);
        }
      }
    }

    .file-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 4px;
      font-size: 12px;
      color: rgba(0, 255, 0, 0.8);

      &:hover {
        background: rgba(0, 0, 0, 0.3);
      }
    }

    .file-icon {
      font-size: 16px;
      flex-shrink: 0;
    }

    .file-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
      min-width: 0;
    }

    .file-name {
      display: block;
      word-break: break-word;
      font-weight: 500;
    }

    .file-size {
      display: block;
      font-size: 11px;
      color: rgba(0, 255, 0, 0.5);
    }

    .remove-btn {
      flex-shrink: 0;
      width: 20px;
      height: 20px;
      padding: 0;
      background: rgba(255, 0, 0, 0.1);
      border: 1px solid rgba(255, 0, 0, 0.3);
      border-radius: 3px;
      color: rgba(255, 0, 0, 0.6);
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s ease;

      &:hover {
        background: rgba(255, 0, 0, 0.2);
        border-color: rgba(255, 0, 0, 0.6);
      }

      &:active {
        transform: scale(0.9);
      }
    }

    .action-buttons {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    .btn {
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      border: 1px solid;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: inherit;

      &:hover:not(:disabled) {
        transform: scale(1.02);
      }

      &:active:not(:disabled) {
        transform: scale(0.98);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .btn-primary {
      background: rgba(0, 255, 0, 0.2);
      border-color: rgba(0, 255, 0, 0.5);
      color: rgba(0, 255, 0, 0.9);

      &:hover:not(:disabled) {
        background: rgba(0, 255, 0, 0.3);
        border-color: rgba(0, 255, 0, 0.7);
        box-shadow: 0 0 8px rgba(0, 255, 0, 0.3);
      }
    }

    .btn-secondary {
      background: rgba(100, 100, 100, 0.2);
      border-color: rgba(100, 100, 100, 0.4);
      color: rgba(150, 150, 150, 0.8);

      &:hover:not(:disabled) {
        background: rgba(100, 100, 100, 0.3);
        border-color: rgba(100, 100, 100, 0.6);
      }
    }

    /* Retro scanlines */
    .drop-zone::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: repeating-linear-gradient(
        0deg,
        transparent,
        transparent 2px,
        rgba(0, 255, 0, 0.02) 2px,
        rgba(0, 255, 0, 0.02) 4px
      );
      pointer-events: none;
      border-radius: 6px;
    }
  `]
})
export class FileAttachmentInputComponent {
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;
  @Output() filesSelected = new EventEmitter<FileMetadata[]>();

  isDragging = signal(false);
  isLoading = signal(false);
  selectedFiles = signal<FileMetadata[]>([]);
  error = signal<string>('');
  maxSizeLabel = '10 MB';

  constructor(private readonly fileAttachmentService: FileAttachmentService) {}

  triggerFileInput(): void {
    this.fileInput?.nativeElement?.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.handleFiles(Array.from(input.files));
      // Reset input so same file can be selected again
      input.value = '';
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    if (event.dataTransfer?.files) {
      this.handleFiles(Array.from(event.dataTransfer.files));
    }
  }

  private handleFiles(files: File[]): void {
    this.error.set('');

    const result = this.fileAttachmentService.validateFiles(files);

    if (result.errors.length > 0) {
      this.error.set(result.errors.join('\n'));
    }

    if (result.valid.length > 0) {
      const newFiles = result.valid.map(file => ({
        ...this.fileAttachmentService.extractFileMetadata(file),
        file: file // Include the actual File object
      }));

      const currentFiles = this.selectedFiles();
      const allFiles = [...currentFiles, ...newFiles];
      
      // Remove duplicates by file name
      const uniqueFiles = Array.from(
        new Map(allFiles.map(f => [f.name, f])).values()
      );

      this.selectedFiles.set(uniqueFiles);
    }
  }

  removeFile(fileName: string): void {
    const current = this.selectedFiles();
    this.selectedFiles.set(current.filter(f => f.name !== fileName));
  }

  clearFiles(): void {
    this.selectedFiles.set([]);
    this.error.set('');
  }

  truncateFileName(fileName: string, maxLength: number): string {
    if (fileName.length <= maxLength) return fileName;
    
    const ext = fileName.split('.').pop() || '';
    const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
    const maxNameLength = maxLength - ext.length - 3;
    
    return `${nameWithoutExt.substring(0, maxNameLength)}...${ext ? '.' + ext : ''}`;
  }

  formatFileSize(bytes: number): string {
    return this.fileAttachmentService.formatFileSize(bytes);
  }

  getFileIcon(fileName: string): string {
    return this.fileAttachmentService.getFileIcon(fileName);
  }

  async submitFiles(): Promise<void> {
    const files = this.selectedFiles();
    if (files.length === 0) return;

    this.isLoading.set(true);
    try {
      this.filesSelected.emit(files);
      // Clear after emit
      setTimeout(() => {
        this.clearFiles();
        this.isLoading.set(false);
      }, 500);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      this.error.set(`Failed to process files: ${errorMessage}`);
      this.isLoading.set(false);
    }
  }
}
