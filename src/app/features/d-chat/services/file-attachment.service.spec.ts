import { TestBed } from '@angular/core/testing';
import { FileAttachmentService } from './file-attachment.service';
import { MAX_FILE_SIZE } from '../models/file-attachment.model';

describe('FileAttachmentService', () => {
  let service: FileAttachmentService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FileAttachmentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getFileExtension', () => {
    it('should extract file extension correctly', () => {
      expect(service.getFileExtension('document.pdf')).toBe('pdf');
      expect(service.getFileExtension('image.PNG')).toBe('png');
      expect(service.getFileExtension('archive.tar.gz')).toBe('gz');
    });

    it('should return empty string for files without extension', () => {
      expect(service.getFileExtension('README')).toBe('');
    });

    it('should handle hidden files', () => {
      expect(service.getFileExtension('.gitignore')).toBe('gitignore');
    });
  });

  describe('getFileCategory', () => {
    it('should categorize document files correctly', () => {
      expect(service.getFileCategory('report.pdf')).toBe('document');
      expect(service.getFileCategory('spreadsheet.xlsx')).toBe('document');
    });

    it('should categorize image files correctly', () => {
      expect(service.getFileCategory('photo.jpg')).toBe('image');
      expect(service.getFileCategory('icon.png')).toBe('image');
    });

    it('should categorize video files correctly', () => {
      expect(service.getFileCategory('movie.mp4')).toBe('video');
      expect(service.getFileCategory('clip.mkv')).toBe('video');
    });

    it('should categorize audio files correctly', () => {
      expect(service.getFileCategory('song.mp3')).toBe('audio');
      expect(service.getFileCategory('podcast.wav')).toBe('audio');
    });

    it('should categorize archive files correctly', () => {
      expect(service.getFileCategory('compressed.zip')).toBe('archive');
      expect(service.getFileCategory('backup.7z')).toBe('archive');
    });

    it('should categorize code files correctly', () => {
      expect(service.getFileCategory('script.js')).toBe('code');
      expect(service.getFileCategory('main.ts')).toBe('code');
    });

    it('should return default for unknown extensions', () => {
      expect(service.getFileCategory('unknown.xyz')).toBe('default');
      expect(service.getFileCategory('noextension')).toBe('default');
    });
  });

  describe('getFileIcon', () => {
    it('should return correct emoji icon for each category', () => {
      expect(service.getFileIcon('document.pdf')).toBe('📄');
      expect(service.getFileIcon('image.jpg')).toBe('🖼️');
      expect(service.getFileIcon('movie.mp4')).toBe('🎬');
      expect(service.getFileIcon('song.mp3')).toBe('🎵');
      expect(service.getFileIcon('archive.zip')).toBe('📦');
      expect(service.getFileIcon('code.js')).toBe('💻');
    });

    it('should return default icon for unknown files', () => {
      expect(service.getFileIcon('unknown.xyz')).toBe('📎');
    });
  });

  describe('getFileCategoryLabel', () => {
    it('should return correct label for each category', () => {
      expect(service.getFileCategoryLabel('document.pdf')).toBe('Document');
      expect(service.getFileCategoryLabel('image.jpg')).toBe('Image');
      expect(service.getFileCategoryLabel('movie.mp4')).toBe('Video');
      expect(service.getFileCategoryLabel('song.mp3')).toBe('Audio');
      expect(service.getFileCategoryLabel('archive.zip')).toBe('Archive');
      expect(service.getFileCategoryLabel('code.js')).toBe('Code');
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(service.formatFileSize(0)).toBe('0 B');
      expect(service.formatFileSize(512)).toBe('512 B');
      expect(service.formatFileSize(1024)).toBe('1 KB');
      expect(service.formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(service.formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('should handle decimal sizes', () => {
      const size = 1536; // 1.5 KB
      const formatted = service.formatFileSize(size);
      expect(formatted).toContain('KB');
      expect(formatted).toContain('1.5');
    });

    it('should handle large files', () => {
      const size = MAX_FILE_SIZE; // 10 MB
      const formatted = service.formatFileSize(size);
      expect(formatted).toContain('MB');
      expect(formatted).toContain('10');
    });
  });

  describe('isFileSizeValid', () => {
    it('should return true for files within size limit', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      expect(service.isFileSizeValid(file)).toBe(true);
    });

    it('should return false for files exceeding size limit', () => {
      const largeContent = new Array(MAX_FILE_SIZE + 1).fill('a').join('');
      const file = new File([largeContent], 'large.bin', { type: 'application/octet-stream' });
      expect(service.isFileSizeValid(file)).toBe(false);
    });

    it('should return true for files at exactly the size limit', () => {
      const content = new Array(MAX_FILE_SIZE).fill('a').join('');
      const file = new File([content], 'exact.bin', { type: 'application/octet-stream' });
      expect(service.isFileSizeValid(file)).toBe(true);
    });
  });

  describe('getFileSizeErrorMessage', () => {
    it('should return error message for oversized files', () => {
      const largeContent = new Array(MAX_FILE_SIZE + 1).fill('a').join('');
      const file = new File([largeContent], 'large.bin', { type: 'application/octet-stream' });
      const error = service.getFileSizeErrorMessage(file);
      expect(error).toContain('exceeds maximum limit');
      expect(error).toContain('10 MB');
    });

    it('should return empty string for valid files', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      expect(service.getFileSizeErrorMessage(file)).toBe('');
    });
  });

  describe('extractFileMetadata', () => {
    it('should extract metadata from file', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const metadata = service.extractFileMetadata(file);
      
      expect(metadata.name).toBe('test.txt');
      expect(metadata.size).toBe(7);
      expect(metadata.type).toBe('text/plain');
      expect(metadata.lastModified).toBeDefined();
    });

    it('should handle files with various types', () => {
      const pdfFile = new File(['content'], 'doc.pdf', { type: 'application/pdf' });
      const metadata = service.extractFileMetadata(pdfFile);
      
      expect(metadata.type).toBe('application/pdf');
      expect(metadata.name).toBe('doc.pdf');
    });
  });

  describe('createDownloadLink', () => {
    it('should create and trigger download', () => {
      const url = 'blob:http://example.com/123';
      const fileName = 'test.txt';
      
      // Spy on document methods
      const createElementSpy = jest.spyOn(document, 'createElement');
      const appendChildSpy = jest.spyOn(document.body, 'appendChild');
      const removeChildSpy = jest.spyOn(document.body, 'removeChild');
      
      service.createDownloadLink(url, fileName);
      
      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
      
      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });

    it('should use default filename if not provided', () => {
      const url = 'blob:http://example.com/123';
      
      const createElementSpy = jest.spyOn(document, 'createElement');
      service.createDownloadLink(url, '');
      
      const linkElement = createElementSpy.mock.results[0].value as HTMLAnchorElement;
      expect(linkElement.download).toBe('download');
      
      createElementSpy.mockRestore();
    });
  });

  describe('fileToBase64', () => {
    it('should convert file to base64', async () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const base64 = await service.fileToBase64(file);
      
      expect(base64).toContain('data:text/plain');
      expect(base64).toContain('base64');
    });

    it('should handle different file types', async () => {
      const file = new File(['content'], 'image.png', { type: 'image/png' });
      const base64 = await service.fileToBase64(file);
      
      expect(base64).toContain('data:image/png');
    });
  });

  describe('validateFiles', () => {
    it('should separate valid and invalid files', () => {
      const validFile = new File(['content'], 'small.txt', { type: 'text/plain' });
      const largeContent = new Array(MAX_FILE_SIZE + 1).fill('a').join('');
      const invalidFile = new File([largeContent], 'large.bin', { type: 'application/octet-stream' });
      
      const result = service.validateFiles([validFile, invalidFile]);
      
      expect(result.valid.length).toBe(1);
      expect(result.valid[0].name).toBe('small.txt');
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]).toContain('exceeds maximum limit');
    });

    it('should handle all valid files', () => {
      const file1 = new File(['content1'], 'file1.txt', { type: 'text/plain' });
      const file2 = new File(['content2'], 'file2.txt', { type: 'text/plain' });
      
      const result = service.validateFiles([file1, file2]);
      
      expect(result.valid.length).toBe(2);
      expect(result.errors.length).toBe(0);
    });

    it('should handle empty array', () => {
      const result = service.validateFiles([]);
      
      expect(result.valid.length).toBe(0);
      expect(result.errors.length).toBe(0);
    });
  });
});
