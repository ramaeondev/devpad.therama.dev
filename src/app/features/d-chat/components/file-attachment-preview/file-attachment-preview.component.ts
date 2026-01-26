import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileAttachment } from '../../models/file-attachment.model';
import { FileAttachmentService } from '../../services/file-attachment.service';

@Component({
  selector: 'app-file-attachment-preview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="file-attachment-card" (mouseenter)="isHovering = true" (mouseleave)="isHovering = false">
      <!-- File Icon and Type -->
      <div class="file-icon-container">
        <span class="file-icon" [title]="fileCategory">{{ fileIcon }}</span>
        <span class="file-type-badge">{{ fileCategory }}</span>
      </div>

      <!-- File Info Section -->
      <div class="file-info">
        <h4 class="file-name" [title]="attachment.fileName">{{ truncateFileName(attachment.fileName, 20) }}</h4>
        <p class="file-size">{{ formatSize(attachment.fileSize) }}</p>
        <p class="upload-time" *ngIf="uploadedTime">{{ uploadedTime }}</p>
      </div>

      <!-- Actions -->
      <div class="file-actions" [class.visible]="isHovering">
        <button 
          class="action-btn download-btn" 
          (click)="onDownload()"
          title="Download file"
          type="button">
          <span class="action-icon">⬇️</span>
          <span class="action-label">Download</span>
        </button>
        <button 
          *ngIf="showDelete"
          class="action-btn delete-btn" 
          (click)="onDelete()"
          title="Delete file"
          type="button">
          <span class="action-icon">🗑️</span>
          <span class="action-label">Delete</span>
        </button>
      </div>

      <!-- Mime Type Indicator (hidden) -->
      <input type="hidden" [value]="attachment.mimeType" />
    </div>
  `,
  styles: [`
    .file-attachment-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: linear-gradient(135deg, rgba(0, 255, 0, 0.05) 0%, rgba(0, 128, 0, 0.05) 100%);
      border: 1px solid rgba(0, 255, 0, 0.3);
      border-radius: 8px;
      cursor: default;
      transition: all 0.2s ease;
      position: relative;
      overflow: hidden;

      &:hover {
        background: linear-gradient(135deg, rgba(0, 255, 0, 0.1) 0%, rgba(0, 128, 0, 0.1) 100%);
        border-color: rgba(0, 255, 0, 0.6);
        box-shadow: 0 0 12px rgba(0, 255, 0, 0.2);
      }

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: repeating-linear-gradient(
          90deg,
          transparent,
          transparent 2px,
          rgba(0, 255, 0, 0.03) 2px,
          rgba(0, 255, 0, 0.03) 4px
        );
        pointer-events: none;
      }
    }

    .file-icon-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
      position: relative;
      z-index: 1;
    }

    .file-icon {
      font-size: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 6px;
      background: rgba(0, 255, 0, 0.1);
      border: 1px solid rgba(0, 255, 0, 0.3);
      transition: all 0.2s ease;

      @media (prefers-color-scheme: dark) {
        background: rgba(0, 255, 0, 0.15);
      }
    }

    .file-type-badge {
      font-size: 10px;
      color: rgba(0, 255, 0, 0.7);
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }

    .file-info {
      flex: 1;
      min-width: 0;
      position: relative;
      z-index: 1;
    }

    .file-name {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: rgba(0, 255, 0, 0.9);
      word-break: break-word;
      text-shadow: 0 0 4px rgba(0, 0, 0, 0.3);

      dark:& {
        color: rgba(0, 255, 0, 0.8);
      }
    }

    .file-size {
      margin: 4px 0 0;
      font-size: 12px;
      color: rgba(0, 255, 0, 0.6);
      font-family: 'Courier New', monospace;
    }

    .upload-time {
      margin: 2px 0 0;
      font-size: 11px;
      color: rgba(0, 255, 0, 0.5);
      font-family: 'Courier New', monospace;
    }

    .file-actions {
      display: flex;
      gap: 8px;
      position: relative;
      z-index: 2;
      opacity: 0;
      transition: opacity 0.2s ease;

      &.visible {
        opacity: 1;
      }
    }

    .action-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px 10px;
      background: rgba(0, 255, 0, 0.15);
      border: 1px solid rgba(0, 255, 0, 0.4);
      border-radius: 4px;
      color: rgba(0, 255, 0, 0.8);
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      transition: all 0.2s ease;
      white-space: nowrap;
      font-family: inherit;

      &:hover {
        background: rgba(0, 255, 0, 0.25);
        border-color: rgba(0, 255, 0, 0.6);
        box-shadow: 0 0 8px rgba(0, 255, 0, 0.3);
        transform: scale(1.05);
      }

      &:active {
        transform: scale(0.98);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .action-icon {
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .action-label {
      display: none;

      @media (min-width: 768px) {
        display: inline;
      }
    }

    .download-btn {
      &:hover {
        background: rgba(0, 255, 0, 0.2);
      }
    }

    .delete-btn {
      background: rgba(255, 0, 0, 0.1);
      border-color: rgba(255, 0, 0, 0.4);
      color: rgba(255, 0, 0, 0.7);

      &:hover {
        background: rgba(255, 0, 0, 0.2);
        border-color: rgba(255, 0, 0, 0.6);
        box-shadow: 0 0 8px rgba(255, 0, 0, 0.3);
      }
    }

    /* Retro scanline effect */
    @keyframes flicker {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.98; }
    }

    .file-attachment-card {
      animation: flicker 3s infinite;
    }
  `]
})
export class FileAttachmentPreviewComponent implements OnInit {
  @Input() attachment!: FileAttachment;
  @Input() showDelete = false;
  @Output() download = new EventEmitter<FileAttachment>();
  @Output() delete = new EventEmitter<FileAttachment>();

  isHovering = false;
  fileIcon = '📎';
  fileCategory = 'File';
  uploadedTime = '';

  constructor(private readonly fileAttachmentService: FileAttachmentService) {}

  ngOnInit(): void {
    this.updateFileInfo();
  }

  private updateFileInfo(): void {
    this.fileIcon = this.fileAttachmentService.getFileIcon(this.attachment.fileName);
    this.fileCategory = this.fileAttachmentService.getFileCategoryLabel(this.attachment.fileName);
    this.uploadedTime = this.getRelativeTime(new Date(this.attachment.uploadedAt));
  }

  private getRelativeTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  }

  truncateFileName(fileName: string, maxLength: number): string {
    if (fileName.length <= maxLength) return fileName;
    
    const ext = fileName.split('.').pop() || '';
    const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
    const maxNameLength = maxLength - ext.length - 4; // 4 for "..."
    
    return `${nameWithoutExt.substring(0, maxNameLength)}...${ext ? '.' + ext : ''}`;
  }

  formatSize(bytes: number): string {
    return this.fileAttachmentService.formatFileSize(bytes);
  }

  onDownload(): void {
    this.download.emit(this.attachment);
  }

  onDelete(): void {
    this.delete.emit(this.attachment);
  }
}
