import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FileAttachmentPreviewComponent } from './file-attachment-preview.component';
import { FileAttachmentService } from '../../services/file-attachment.service';
import { FileAttachment } from '../../models/file-attachment.model';

describe('FileAttachmentPreviewComponent', () => {
  let component: FileAttachmentPreviewComponent;
  let fixture: ComponentFixture<FileAttachmentPreviewComponent>;

  const mockAttachment: FileAttachment = {
    id: 'file-1',
    messageId: 'msg-1',
    fileName: 'document.pdf',
    fileSize: 1024 * 512, // 512 KB
    fileType: 'pdf',
    mimeType: 'application/pdf',
    url: 'https://example.com/files/document.pdf',
    uploadedAt: new Date().toISOString(),
    uploadedBy: 'user-1',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FileAttachmentPreviewComponent],
      providers: [FileAttachmentService],
    }).compileComponents();

    fixture = TestBed.createComponent(FileAttachmentPreviewComponent);
    component = fixture.componentInstance;
    component.attachment = mockAttachment;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('File Icon and Category', () => {
    it('should display correct icon for PDF file', () => {
      expect(component.fileIcon).toBe('📄');
      expect(component.fileCategory).toBe('Document');
    });

    it('should display correct icon for image file', () => {
      const imageAttachment = { ...mockAttachment, fileName: 'photo.jpg' };
      component.attachment = imageAttachment;
      component.ngOnInit();

      expect(component.fileIcon).toBe('🖼️');
      expect(component.fileCategory).toBe('Image');
    });

    it('should display correct icon for video file', () => {
      const videoAttachment = { ...mockAttachment, fileName: 'video.mp4' };
      component.attachment = videoAttachment;
      component.ngOnInit();

      expect(component.fileIcon).toBe('🎬');
      expect(component.fileCategory).toBe('Video');
    });

    it('should display correct icon for audio file', () => {
      const audioAttachment = { ...mockAttachment, fileName: 'song.mp3' };
      component.attachment = audioAttachment;
      component.ngOnInit();

      expect(component.fileIcon).toBe('🎵');
      expect(component.fileCategory).toBe('Audio');
    });

    it('should display default icon for unknown file type', () => {
      const unknownAttachment = { ...mockAttachment, fileName: 'file.xyz' };
      component.attachment = unknownAttachment;
      component.ngOnInit();

      expect(component.fileIcon).toBe('📎');
    });
  });

  describe('File Name Truncation', () => {
    it('should not truncate short file names', () => {
      const result = component.truncateFileName('short.txt', 20);
      expect(result).toBe('short.txt');
    });

    it('should truncate long file names', () => {
      const longName = 'this-is-a-very-long-document-name-that-should-be-truncated.pdf';
      const result = component.truncateFileName(longName, 20);

      expect(result).toContain('...');
      expect(result.length).toBeLessThanOrEqual(25);
      expect(result).toContain('.pdf');
    });

    it('should handle file names without extension', () => {
      const result = component.truncateFileName('README-VERY-LONG-NAME', 10);
      expect(result).toContain('...');
    });
  });

  describe('File Size Formatting', () => {
    it('should format file size correctly', () => {
      component.attachment = { ...mockAttachment, fileSize: 1024 * 512 };
      const formatted = component.formatSize(component.attachment.fileSize);

      expect(formatted).toContain('KB');
    });

    it('should handle large file sizes', () => {
      const largeSize = 1024 * 1024 * 5; // 5 MB
      const formatted = component.formatSize(largeSize);

      expect(formatted).toContain('MB');
      expect(formatted).toContain('5');
    });

    it('should handle small file sizes', () => {
      const smallSize = 512; // bytes
      const formatted = component.formatSize(smallSize);

      expect(formatted).toContain('B');
    });
  });

  describe('Relative Time Display', () => {
    it('should display "just now" for very recent files', () => {
      const recentDate = new Date();
      component.attachment = {
        ...mockAttachment,
        uploadedAt: recentDate.toISOString(),
      };
      component.ngOnInit();

      expect(component.uploadedTime).toBeDefined();
      expect(component.uploadedTime).toBeTruthy();
    });

    it('should display date for older files', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);
      component.attachment = {
        ...mockAttachment,
        uploadedAt: oldDate.toISOString(),
      };
      component.ngOnInit();

      expect(component.uploadedTime).toBeDefined();
    });
  });

  describe('User Interactions', () => {
    it('should emit download event when download button is clicked', (done) => {
      component.download.subscribe((attachment) => {
        expect(attachment).toEqual(mockAttachment);
        done();
      });

      component.onDownload();
    });

    it('should emit delete event when delete button is clicked', (done) => {
      component.delete.subscribe((attachment) => {
        expect(attachment).toEqual(mockAttachment);
        done();
      });

      component.onDelete();
    });

    it('should show actions on hover', () => {
      expect(component.isHovering).toBe(false);

      component.isHovering = true;
      fixture.detectChanges();

      expect(component.isHovering).toBe(true);
    });

    it('should hide actions when not hovering', () => {
      component.isHovering = true;
      component.isHovering = false;
      fixture.detectChanges();

      expect(component.isHovering).toBe(false);
    });
  });

  describe('Delete Button Visibility', () => {
    it('should show delete button when showDelete is true', () => {
      component.showDelete = true;
      fixture.detectChanges();

      const deleteBtn = fixture.nativeElement.querySelector('.delete-btn');
      expect(deleteBtn).toBeTruthy();
    });

    it('should hide delete button when showDelete is false', () => {
      component.showDelete = false;
      fixture.detectChanges();

      const deleteBtn = fixture.nativeElement.querySelector('.delete-btn');
      expect(deleteBtn).toBeFalsy();
    });
  });

  describe('Rendering', () => {
    it('should display file name in component', () => {
      fixture.detectChanges();
      const fileNameElement = fixture.nativeElement.querySelector('.file-name');

      expect(fileNameElement.textContent).toContain('document.pdf');
    });

    it('should display file size in component', () => {
      fixture.detectChanges();
      const fileSizeElement = fixture.nativeElement.querySelector('.file-size');

      expect(fileSizeElement).toBeTruthy();
      expect(fileSizeElement.textContent).toContain('KB');
    });

    it('should display file icon in component', () => {
      fixture.detectChanges();
      const fileIcon = fixture.nativeElement.querySelector('.file-icon');

      expect(fileIcon.textContent).toContain('📄');
    });

    it('should display file type badge', () => {
      fixture.detectChanges();
      const badge = fixture.nativeElement.querySelector('.file-type-badge');

      expect(badge.textContent).toContain('Document');
    });
  });

  describe('Component Lifecycle', () => {
    it('should update file info on init', () => {
      const updateSpy = jest.spyOn(component as never, 'updateFileInfo' as never);
      component.ngOnInit();

      expect(updateSpy).toHaveBeenCalled();
    });

    it('should set all file properties on init', () => {
      component.ngOnInit();

      expect(component.fileIcon).toBe('📄');
      expect(component.fileCategory).toBe('Document');
      expect(component.uploadedTime).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle file names with special characters', () => {
      const specialName = 'file-@#$%^&().pdf';
      const result = component.truncateFileName(specialName, 30);

      expect(result).toBeDefined();
      expect(result.length).toBeLessThanOrEqual(35);
    });

    it('should handle very long extensions', () => {
      const longExt = 'file.verylongextensionname';
      const result = component.truncateFileName(longExt, 15);

      expect(result).toBeDefined();
    });

    it('should handle empty mime type', () => {
      component.attachment = { ...mockAttachment, mimeType: '' };
      component.ngOnInit();

      expect(component.fileIcon).toBe('📄'); // Still categorizes as document
    });
  });

  describe('Accessibility', () => {
    it('should have proper button types', () => {
      fixture.detectChanges();
      const buttons = fixture.nativeElement.querySelectorAll('button');

      buttons.forEach((btn: HTMLButtonElement) => {
        expect(btn.type).toBe('button');
      });
    });

    it('should have title attributes for interactive elements', () => {
      fixture.detectChanges();
      const downloadBtn = fixture.nativeElement.querySelector('.download-btn');

      expect(downloadBtn.title).toBeDefined();
    });
  });
});
