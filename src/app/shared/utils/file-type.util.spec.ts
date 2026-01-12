import {
  getExtensionFromPath,
  getTypeLabelFromExt,
  getIconNameFromExt,
  getIconNameFromMime,
  getIconNameFromNameAndMime,
} from './file-type.util';

describe('file-type.util', () => {
  describe('getExtensionFromPath', () => {
    it('returns empty for null/undefined', () => {
      expect(getExtensionFromPath(null)).toBe('');
      expect(getExtensionFromPath(undefined)).toBe('');
    });

    it('parses storage:// prefix and query params', () => {
      expect(getExtensionFromPath('storage://path/to/file.pdf')).toBe('pdf');
      expect(getExtensionFromPath('storage://file.name.tar.gz?foo=1')).toBe('gz');
    });

    it('handles uppercase and multi-dots', () => {
      expect(getExtensionFromPath('ARCHIVE.TAR.GZ')).toBe('gz');
      expect(getExtensionFromPath('/path/with.dot/name.MD')).toBe('md');
    });

    it('returns the last segment for plain names and empty for trailing slash', () => {
      // For a plain filename without dot, the function returns the whole name
      expect(getExtensionFromPath('noext')).toBe('noext');
      // But a trailing slash represents a directory with no filename
      expect(getExtensionFromPath('/path/to/dir/')).toBe('');
    });
  });

  describe('getTypeLabelFromExt', () => {
    it('maps known extensions', () => {
      expect(getTypeLabelFromExt('docx')).toBe('Word');
      expect(getTypeLabelFromExt('xlsx')).toBe('Excel');
      expect(getTypeLabelFromExt('pptx')).toBe('PowerPoint');
      expect(getTypeLabelFromExt('pdf')).toBe('PDF');
      expect(getTypeLabelFromExt('txt')).toBe('Text');
      expect(getTypeLabelFromExt('md')).toBe('Markdown');
      expect(getTypeLabelFromExt('jpg')).toBe('Image');
      expect(getTypeLabelFromExt('mp4')).toBe('Video');
      expect(getTypeLabelFromExt('mp3')).toBe('Audio');
      expect(getTypeLabelFromExt('zip')).toBe('Archive');
    });

    it('returns Document for unknown extensions', () => {
      expect(getTypeLabelFromExt('unknown')).toBe('Document');
    });
  });

  describe('getIconNameFromExt', () => {
    it('returns correct icon names', () => {
      expect(getIconNameFromExt('pdf')).toBe('fa-file-pdf');
      expect(getIconNameFromExt('docx')).toBe('fa-file-word');
      expect(getIconNameFromExt('xlsx')).toBe('fa-file-excel');
      expect(getIconNameFromExt('csv')).toBe('fa-file-csv');
      expect(getIconNameFromExt('jpg')).toBe('fa-file-image');
      expect(getIconNameFromExt('mp4')).toBe('fa-file-video');
      expect(getIconNameFromExt('mp3')).toBe('fa-file-audio');
      expect(getIconNameFromExt('zip')).toBe('fa-file-zipper');
      expect(getIconNameFromExt('unknown')).toBe('fa-file');
    });
  });

  describe('getIconNameFromMime', () => {
    it('maps mimetypes to icons', () => {
      expect(getIconNameFromMime('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe('fa-file-excel');
      expect(getIconNameFromMime('application/vnd.openxmlformats-officedocument.presentationml.presentation')).toBe('fa-file-powerpoint');
      expect(getIconNameFromMime('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('fa-file-word');
      expect(getIconNameFromMime('application/pdf')).toBe('fa-file-pdf');
      expect(getIconNameFromMime('image/png')).toBe('fa-file-image');
      expect(getIconNameFromMime('')).toBe('fa-file');
    });
  });

  describe('getIconNameFromNameAndMime', () => {
    it('prefers extension when available', () => {
      expect(getIconNameFromNameAndMime('file.pdf', 'application/something')).toBe('fa-file-pdf');
    });

    it('falls back to mime when name is empty', () => {
      expect(getIconNameFromNameAndMime(undefined, 'image/jpeg')).toBe('fa-file-image');
    });

    it('returns default when neither present', () => {
      expect(getIconNameFromNameAndMime()).toBe('fa-file');
    });
  });
});
