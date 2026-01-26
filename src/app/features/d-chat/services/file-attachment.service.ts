import { Injectable } from '@angular/core';
import { FileMetadata, FILE_CATEGORIES, MAX_FILE_SIZE, FILE_SIZE_UNITS } from '../models/file-attachment.model';

/**
 * Service for handling file attachment operations
 */
@Injectable({
  providedIn: 'root'
})
export class FileAttachmentService {

  /**
   * Get file extension from file name
   */
  getFileExtension(fileName: string): string {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts.at(-1)?.toLowerCase() ?? '' : '';
  }

  /**
   * Get file category based on extension
   */
  getFileCategory(fileName: string): string {
    const extension = this.getFileExtension(fileName);
    
    for (const [category, config] of Object.entries(FILE_CATEGORIES)) {
      if (category !== 'default' && config.extensions.includes(extension as never)) {
        return category;
      }
    }
    
    return 'default';
  }

  /**
   * Get file icon emoji
   */
  getFileIcon(fileName: string): string {
    const category = this.getFileCategory(fileName);
    return FILE_CATEGORIES[category as keyof typeof FILE_CATEGORIES]?.icon || '📎';
  }

  /**
   * Get file category label
   */
  getFileCategoryLabel(fileName: string): string {
    const category = this.getFileCategory(fileName);
    return FILE_CATEGORIES[category as keyof typeof FILE_CATEGORIES]?.label || 'File';
  }

  /**
   * Format file size to human-readable format
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const value = Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2));
    
    return `${value} ${FILE_SIZE_UNITS[i] || 'B'}`;
  }

  /**
   * Validate file size
   */
  isFileSizeValid(file: File): boolean {
    return file.size <= MAX_FILE_SIZE;
  }

  /**
   * Get file size validation error message
   */
  getFileSizeErrorMessage(file: File): string {
    if (!this.isFileSizeValid(file)) {
      return `File size exceeds maximum limit of ${this.formatFileSize(MAX_FILE_SIZE)}`;
    }
    return '';
  }

  /**
   * Extract file metadata
   */
  extractFileMetadata(file: File): FileMetadata {
    return {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    };
  }

  /**
   * Create a download link for a file
   */
  createDownloadLink(url: string, fileName: string): void {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'download';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  /**
   * Convert file to base64 for inline storage (for small files)
   */
  fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Validate multiple files
   */
  validateFiles(files: File[]): { valid: File[], errors: string[] } {
    const valid: File[] = [];
    const errors: string[] = [];

    files.forEach((file, index) => {
      if (this.isFileSizeValid(file)) {
        valid.push(file);
      } else {
        errors.push(`File ${index + 1} (${file.name}): ${this.getFileSizeErrorMessage(file)}`);
      }
    });

    return { valid, errors };
  }
}
