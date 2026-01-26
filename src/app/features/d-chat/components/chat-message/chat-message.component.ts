import { Component, Input, Output, EventEmitter, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { DMessage, DMessageAttachment } from '../../../../core/models/d-chat.model';
import { MarkdownFormatter, detectMessageType } from '../../utils/markdown-formatter';
import { LinkPreviewComponent } from '../link-preview/link-preview.component';
import { LinkPreviewService } from '../../services/link-preview.service';
import { DChatService } from '../../d-chat.service';
import {
  MessageKebabMenuComponent,
  MessageAction,
} from '../message-kebab-menu/message-kebab-menu.component';

@Component({
  selector: 'app-chat-message',
  standalone: true,
  imports: [CommonModule, LinkPreviewComponent, MessageKebabMenuComponent],
  templateUrl: './chat-message.component.html',
  styleUrls: ['./chat-message.component.scss'],
})
export class ChatMessageComponent implements OnInit {
  @Input() message!: DMessage;
  @Input() isOwn: boolean = false;
  @Input() otherUserOnline: boolean = false;
  @Output() deleteAttachment = new EventEmitter<string>();
  @Output() replyToMessage = new EventEmitter<DMessage>();
  @Output() forwardMessage = new EventEmitter<DMessage>();
  @Output() editMessage = new EventEmitter<DMessage>();
  @Output() deleteMessage = new EventEmitter<DMessage>();
  @Output() pinMessage = new EventEmitter<DMessage>();
  @Output() messageAction = new EventEmitter<{ action: MessageAction; message: DMessage }>();

  private readonly sanitizer = inject(DomSanitizer);
  private readonly linkPreviewService = inject(LinkPreviewService);
  private readonly dChatService = inject(DChatService);

  messageType = signal<'text' | 'formatted' | 'code' | 'quote' | 'mixed'>('text');
  formattedContent = signal<SafeHtml>('');
  messageUrls = signal<string[]>([]);
  attachmentUrls = signal<Map<string, string>>(new Map());
  imageAttachments = signal<DMessageAttachment[]>([]);
  documentAttachments = signal<DMessageAttachment[]>([]);
  isMessageReplied = signal<boolean>(false);
  isPinned = signal<boolean>(false);

  ngOnInit(): void {
    if (this.message?.content) {
      this.messageType.set(detectMessageType(this.message.content));
      const formatted = MarkdownFormatter.format(this.message.content);
      this.formattedContent.set(this.sanitizer.bypassSecurityTrustHtml(formatted));

      // Extract URLs from message
      const urls = this.linkPreviewService.extractUrls(this.message.content);
      this.messageUrls.set(urls);
    }

    // Load attachment URLs and categorize
    if (this.message?.attachments && this.message.attachments.length > 0) {
      this.loadAttachmentUrls();
      this.categorizeAttachments();
    }
  }

  /**
   * Load public URLs for all attachments
   */
  private loadAttachmentUrls(): void {
    if (!this.message?.attachments) return;

    const urlMap = new Map<string, string>();
    this.message.attachments.forEach((attachment) => {
      const url = this.dChatService.getAttachmentUrl(attachment.storage_path);
      urlMap.set(attachment.id, url);
    });
    this.attachmentUrls.set(urlMap);
  }

  /**
   * Categorize attachments into images and documents
   */
  private categorizeAttachments(): void {
    if (!this.message?.attachments) return;

    const images: DMessageAttachment[] = [];
    const documents: DMessageAttachment[] = [];

    this.message.attachments.forEach((attachment) => {
      const mimeType = attachment.file_type.toLowerCase();
      const isImage =
        mimeType.startsWith('image/') ||
        ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].some((ext) =>
          attachment.file_name.toLowerCase().endsWith(ext),
        );

      if (isImage) {
        images.push(attachment);
      } else {
        documents.push(attachment);
      }
    });

    this.imageAttachments.set(images);
    this.documentAttachments.set(documents);
  }

  /**
   * Get public URL for an attachment
   */
  getAttachmentUrl(attachmentId: string): string {
    return this.attachmentUrls().get(attachmentId) || '';
  }

  /**
   * Check if file type is an image
   */
  isImage(attachment: DMessageAttachment): boolean {
    const mimeType = attachment.file_type.toLowerCase();
    const isImageMime = mimeType.startsWith('image/');
    const isImageExt = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].some((ext) =>
      attachment.file_name.toLowerCase().endsWith(ext),
    );
    return isImageMime || isImageExt;
  }

  /**
   * Handle attachment download or open in new window
   */
  onAttachmentDownload(attachment: DMessageAttachment, openInNewWindow: boolean = false): void {
    const url = this.getAttachmentUrl(attachment.id);
    if (!url) return;

    if (openInNewWindow) {
      // Open in new window/tab
      window.open(url, '_blank');
    } else {
      // Download file to user's machine
      this.downloadFile(url, attachment.file_name);
    }
  }

  /**
   * Download file to user's machine using fetch API
   */
  private async downloadFile(url: string, fileName: string): Promise<void> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();

      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading file:', error);
      // Fallback: open in new window if download fails
      window.open(url, '_blank');
    }
  }

  /**
   * Handle image keyboard interaction (Enter/Space) - button already handles this, but kept for consistency
   */
  onImageKeyDown(event: KeyboardEvent, attachment: DMessageAttachment): void {
    // Button element natively handles Enter and Space, but we can add custom handling if needed
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onAttachmentDownload(attachment, true);
    }
  }

  /**
   * Handle attachment deletion
   */
  onAttachmentDelete(attachmentId: string): void {
    if (confirm('Are you sure you want to delete this attachment?')) {
      this.deleteAttachment.emit(attachmentId);
    }
  }

  formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  /**
   * Check if message contains images, PDFs, or documents
   */
  hasMedia(type: 'images' | 'pdfs' | 'documents'): boolean {
    if (!this.message?.content) return false;

    const media = MarkdownFormatter.detectMedia(this.message.content);
    const mediaMap = {
      images: media.hasImages,
      pdfs: media.hasPDFs,
      documents: media.hasDocuments,
    };

    return mediaMap[type];
  }

  /**
   * Get file type icon
   */
  getFileIcon(fileType: string): string {
    const iconMap: Record<string, string> = {
      image: 'fa-image',
      pdf: 'fa-file-pdf',
      document: 'fa-file-word',
      unknown: 'fa-file',
    };
    return iconMap[fileType] || 'fa-file';
  }

  /**
   * Get message content with media placeholders
   */
  getMediaPlaceholder(fileType: 'image' | 'pdf' | 'document'): string {
    const placeholders: Record<string, string> = {
      image: '📷 Image (Coming Soon)',
      pdf: '📄 PDF Document (Coming Soon)',
      document: '📃 Document (Coming Soon)',
    };
    return placeholders[fileType] || 'File (Coming Soon)';
  }

  /**
   * Handle message actions from kebab menu
   */
  onMessageAction(action: MessageAction): void {
    switch (action) {
      case 'reply':
        this.replyToMessage.emit(this.message);
        break;
      case 'forward':
        this.forwardMessage.emit(this.message);
        break;
      case 'copy':
        this.copyMessageContent();
        break;
      case 'edit':
        this.editMessage.emit(this.message);
        break;
      case 'delete':
        this.deleteMessageConfirm();
        break;
      case 'pin':
        this.pinMessage.emit(this.message);
        break;
      case 'download':
        this.downloadAllAttachments();
        break;
      case 'open':
        this.openFirstAttachment();
        break;
    }
    this.messageAction.emit({ action, message: this.message });
  }

  /**
   * Copy message content to clipboard
   */
  private copyMessageContent(): void {
    navigator.clipboard.writeText(this.message.content).then(
      () => {
        console.log('Message copied to clipboard');
      },
      (error) => {
        console.error('Failed to copy:', error);
      },
    );
  }

  /**
   * Delete message with confirmation
   */
  private deleteMessageConfirm(): void {
    if (confirm('Are you sure you want to delete this message?')) {
      this.deleteMessage.emit(this.message);
    }
  }

  /**
   * Download all attachments from the message
   */
  private downloadAllAttachments(): void {
    if (!this.message.attachments || this.message.attachments.length === 0) {
      return;
    }

    // Download each attachment
    this.message.attachments.forEach((attachment) => {
      this.onAttachmentDownload(attachment, false);
    });
  }

  /**
   * Open the first attachment (image or file) in a new window
   */
  private openFirstAttachment(): void {
    if (!this.message.attachments || this.message.attachments.length === 0) {
      return;
    }

    // Open the first attachment
    this.onAttachmentDownload(this.message.attachments[0], true);
  }
}
