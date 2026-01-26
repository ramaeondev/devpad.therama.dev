import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FileAttachmentInputComponent } from './file-attachment-input.component';
import { FileAttachmentService } from '../../services/file-attachment.service';
import { MAX_FILE_SIZE } from '../../models/file-attachment.model';

describe('FileAttachmentInputComponent', () => {
  let component: FileAttachmentInputComponent;
  let fixture: ComponentFixture<FileAttachmentInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FileAttachmentInputComponent],
      providers: [FileAttachmentService]
    }).compileComponents();

    fixture = TestBed.createComponent(FileAttachmentInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Drag and Drop', () => {
    it('should set isDragging to true on dragover', () => {
      const event = new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer()
      });

      component.onDragOver(event);
      expect(component.isDragging()).toBe(true);
    });

    it('should set isDragging to false on dragleave', () => {
      component.isDragging.set(true);
      const event = new DragEvent('dragleave', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer()
      });

      component.onDragLeave(event);
      expect(component.isDragging()).toBe(false);
    });

    it('should handle drop event', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);

      const event = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer
      });

      const handleFilesSpy = jest.spyOn(component as never, 'handleFiles' as never);
      component.onDrop(event);

      expect(component.isDragging()).toBe(false);
      expect(handleFilesSpy).toHaveBeenCalled();
    });

    it('should add dropped files to selected files', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);

      const event = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer
      });

      component.onDrop(event);
      expect(component.selectedFiles().length).toBe(1);
      expect(component.selectedFiles()[0].name).toBe('test.txt');
    });
  });

  describe('File Selection', () => {
    it('should trigger file input on click', () => {
      const inputElement = document.createElement('input');
      component.fileInput = { nativeElement: inputElement };
      const clickSpy = jest.spyOn(inputElement, 'click');

      component.triggerFileInput();
      expect(clickSpy).toHaveBeenCalled();
    });

    it('should handle file selection from input', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const event = new Event('change');
      const inputElement = document.createElement('input');
      inputElement.type = 'file';

      Object.defineProperty(inputElement, 'files', {
        value: new DataTransfer().items
      });

      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);

      Object.defineProperty(inputElement, 'files', {
        value: dataTransfer.files
      });

      Object.defineProperty(event, 'target', { value: inputElement });

      component.onFileSelected(event);
      expect(component.selectedFiles().length).toBe(1);
    });

    it('should reset input after selection', () => {
      const inputElement = document.createElement('input');
      inputElement.type = 'file';
      inputElement.value = 'test';
      component.fileInput = { nativeElement: inputElement };

      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);

      Object.defineProperty(inputElement, 'files', {
        value: dataTransfer.files
      });

      const event = { target: inputElement } as unknown as Event;
      component.onFileSelected(event);

      expect(inputElement.value).toBe('');
    });
  });

  describe('File Validation', () => {
    it('should reject files exceeding size limit', () => {
      const largeContent = new Array(MAX_FILE_SIZE + 1).fill('a').join('');
      const largeFile = new File([largeContent], 'large.bin', { type: 'application/octet-stream' });

      component['handleFiles']([largeFile]);

      expect(component.selectedFiles().length).toBe(0);
      expect(component.error()).toContain('exceeds maximum limit');
    });

    it('should accept files within size limit', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });

      component['handleFiles']([file]);

      expect(component.selectedFiles().length).toBe(1);
      expect(component.error()).toBe('');
    });

    it('should handle mixed valid and invalid files', () => {
      const validFile = new File(['content'], 'valid.txt', { type: 'text/plain' });
      const largeContent = new Array(MAX_FILE_SIZE + 1).fill('a').join('');
      const invalidFile = new File([largeContent], 'invalid.bin', { type: 'application/octet-stream' });

      component['handleFiles']([validFile, invalidFile]);

      expect(component.selectedFiles().length).toBe(1);
      expect(component.selectedFiles()[0].name).toBe('valid.txt');
      expect(component.error()).toContain('exceeds maximum limit');
    });
  });

  describe('File Management', () => {
    it('should remove file from selected files', () => {
      const file1 = new File(['content1'], 'file1.txt', { type: 'text/plain' });
      const file2 = new File(['content2'], 'file2.txt', { type: 'text/plain' });

      component['handleFiles']([file1, file2]);
      expect(component.selectedFiles().length).toBe(2);

      component.removeFile('file1.txt');
      expect(component.selectedFiles().length).toBe(1);
      expect(component.selectedFiles()[0].name).toBe('file2.txt');
    });

    it('should clear all selected files', () => {
      const file1 = new File(['content1'], 'file1.txt', { type: 'text/plain' });
      const file2 = new File(['content2'], 'file2.txt', { type: 'text/plain' });

      component['handleFiles']([file1, file2]);
      expect(component.selectedFiles().length).toBe(2);

      component.clearFiles();
      expect(component.selectedFiles().length).toBe(0);
      expect(component.error()).toBe('');
    });

    it('should remove duplicate files', () => {
      const file1 = new File(['content1'], 'duplicate.txt', { type: 'text/plain' });
      const file2 = new File(['content2'], 'duplicate.txt', { type: 'text/plain' });

      component['handleFiles']([file1]);
      component['handleFiles']([file2]);

      expect(component.selectedFiles().length).toBe(1);
    });
  });

  describe('File Name Truncation', () => {
    it('should not truncate short names', () => {
      const result = component.truncateFileName('short.txt', 20);
      expect(result).toBe('short.txt');
    });

    it('should truncate long names', () => {
      const longName = 'this-is-a-very-long-file-name-that-should-be-truncated.pdf';
      const result = component.truncateFileName(longName, 20);

      expect(result).toContain('...');
      expect(result.length).toBeLessThanOrEqual(25);
    });

    it('should preserve extension when truncating', () => {
      const longName = 'verylongfilenamewithextension.pdf';
      const result = component.truncateFileName(longName, 20);

      expect(result).toContain('.pdf');
    });
  });

  describe('File Size Formatting', () => {
    it('should format file size correctly', () => {
      const size = 1024 * 512; // 512 KB
      const formatted = component.formatFileSize(size);

      expect(formatted).toContain('KB');
    });

    it('should handle different size units', () => {
      expect(component.formatFileSize(512)).toContain('B');
      expect(component.formatFileSize(1024)).toContain('KB');
      expect(component.formatFileSize(1024 * 1024)).toContain('MB');
    });
  });

  describe('File Icon', () => {
    it('should return correct icon for different file types', () => {
      expect(component.getFileIcon('document.pdf')).toBe('📄');
      expect(component.getFileIcon('image.jpg')).toBe('🖼️');
      expect(component.getFileIcon('video.mp4')).toBe('🎬');
      expect(component.getFileIcon('song.mp3')).toBe('🎵');
    });
  });

  describe('Submit Files', () => {
    it('should emit filesSelected event with selected files', (done) => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });

      component.filesSelected.subscribe(files => {
        expect(files.length).toBe(1);
        expect(files[0].name).toBe('test.txt');
        done();
      });

      component['handleFiles']([file]);
      component.submitFiles();
    });

    it('should set loading state during submission', async () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      component['handleFiles']([file]);

      expect(component.isLoading()).toBe(false);
      component.submitFiles();
      expect(component.isLoading()).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 600));
      expect(component.isLoading()).toBe(false);
    });

    it('should clear files after submission', async () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      component['handleFiles']([file]);
      expect(component.selectedFiles().length).toBe(1);

      component.submitFiles();
      await new Promise(resolve => setTimeout(resolve, 600));

      expect(component.selectedFiles().length).toBe(0);
    });

    it('should not emit if no files selected', (done) => {
      const subscription = component.filesSelected.subscribe(() => {
        fail('Should not emit');
        done();
      });

      component.submitFiles();

      setTimeout(() => {
        subscription.unsubscribe();
        done();
      }, 100);
    });
  });

  describe('Error Handling', () => {
    it('should display error message for invalid files', () => {
      const largeContent = new Array(MAX_FILE_SIZE + 1).fill('a').join('');
      const largeFile = new File([largeContent], 'large.bin', { type: 'application/octet-stream' });

      component['handleFiles']([largeFile]);

      expect(component.error()).toContain('exceeds maximum limit');
    });

    it('should clear error on new selection', () => {
      const largeContent = new Array(MAX_FILE_SIZE + 1).fill('a').join('');
      const largeFile = new File([largeContent], 'large.bin', { type: 'application/octet-stream' });

      component['handleFiles']([largeFile]);
      expect(component.error()).not.toBe('');

      const validFile = new File(['content'], 'valid.txt', { type: 'text/plain' });
      component['handleFiles']([validFile]);

      expect(component.error()).toBe('');
    });

    it('should clear error when clearing files', () => {
      const largeContent = new Array(MAX_FILE_SIZE + 1).fill('a').join('');
      const largeFile = new File([largeContent], 'large.bin', { type: 'application/octet-stream' });

      component['handleFiles']([largeFile]);
      expect(component.error()).not.toBe('');

      component.clearFiles();
      expect(component.error()).toBe('');
    });
  });

  describe('UI State', () => {
    it('should disable file input when loading', () => {
      component.isLoading.set(true);
      fixture.detectChanges();

      const fileInput = component.fileInput?.nativeElement;
      expect(fileInput?.disabled).toBe(true);
    });

    it('should show submit button only when files selected', () => {
      expect(component.selectedFiles().length).toBe(0);

      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      component['handleFiles']([file]);

      expect(component.selectedFiles().length).toBe(1);
    });

    it('should disable submit button when no files selected', () => {
      component.clearFiles();
      expect(component.selectedFiles().length).toBe(0);
    });
  });

  describe('Component Properties', () => {
    it('should have correct max size label', () => {
      expect(component.maxSizeLabel).toBe('10 MB');
    });

    it('should initialize with empty selected files', () => {
      expect(component.selectedFiles().length).toBe(0);
    });

    it('should initialize with no errors', () => {
      expect(component.error()).toBe('');
    });

    it('should initialize with not dragging state', () => {
      expect(component.isDragging()).toBe(false);
    });

    it('should initialize with not loading state', () => {
      expect(component.isLoading()).toBe(false);
    });
  });
});
