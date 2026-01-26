/**
 * File Attachment Models for D-Chat
 */

/**
 * File attachment data structure
 */
export interface FileAttachment {
  id: string;
  messageId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  mimeType: string;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
}

/**
 * File upload request
 */
export interface FileUploadRequest {
  file: File;
  messageId: string;
  userId: string;
}

/**
 * File upload response
 */
export interface FileUploadResponse {
  success: boolean;
  attachment?: FileAttachment;
  error?: string;
}

/**
 * File metadata
 */
export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  file?: File; // Optional File object for upload
}

/**
 * Supported file categories with icons
 */
export const FILE_CATEGORIES = {
  document: {
    icon: '📄',
    extensions: ['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'ppt', 'pptx'],
    label: 'Document',
  },
  image: {
    icon: '🖼️',
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'],
    label: 'Image',
  },
  video: {
    icon: '🎬',
    extensions: ['mp4', 'avi', 'mkv', 'mov', 'webm', 'flv'],
    label: 'Video',
  },
  audio: {
    icon: '🎵',
    extensions: ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg'],
    label: 'Audio',
  },
  archive: {
    icon: '📦',
    extensions: ['zip', 'rar', '7z', 'tar', 'gz'],
    label: 'Archive',
  },
  code: {
    icon: '💻',
    extensions: ['js', 'ts', 'py', 'java', 'cpp', 'c', 'html', 'css', 'json', 'xml'],
    label: 'Code',
  },
  default: {
    icon: '📎',
    extensions: [],
    label: 'File',
  },
};

/**
 * Maximum file size in bytes (10 MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * File size format constants
 */
export const FILE_SIZE_UNITS = ['B', 'KB', 'MB', 'GB'];
