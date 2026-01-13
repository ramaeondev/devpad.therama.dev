import { GoogleDriveIconPipe } from './google-drive-icon.pipe';

describe('GoogleDriveIconPipe', () => {
  const pipe = new GoogleDriveIconPipe();

  it('returns default for null', () => {
    expect(pipe.transform(null)).toBe('fa-file');
  });

  it('uses extension when available', () => {
    expect(pipe.transform({ name: 'doc.docx', mimeType: '' } as any)).toBe('fa-file-word');
    expect(pipe.transform({ name: 'sheet.xlsx', mimeType: '' } as any)).toBe('fa-file-excel');
    expect(pipe.transform({ name: 'file.pdf', mimeType: '' } as any)).toBe('fa-file-pdf');
    expect(pipe.transform({ name: 'image.png', mimeType: '' } as any)).toBe('fa-file-image');
  });

  it('falls back to google mime types when name has no ext', () => {
    expect(
      pipe.transform({ name: '', mimeType: 'application/vnd.google-apps.document' } as any),
    ).toBe('fa-file-word');
    expect(
      pipe.transform({ name: '', mimeType: 'application/vnd.google-apps.spreadsheet' } as any),
    ).toBe('fa-file-excel');
    expect(
      pipe.transform({ name: '', mimeType: 'application/vnd.google-apps.presentation' } as any),
    ).toBe('fa-file-powerpoint');
  });

  it('falls back to pdf and image mime checks when name has no ext', () => {
    expect(pipe.transform({ name: '', mimeType: 'application/pdf' } as any)).toBe('fa-file-pdf');
    expect(pipe.transform({ name: '', mimeType: 'image/jpeg' } as any)).toBe('fa-file-image');
  });

  it('returns default fallback', () => {
    expect(pipe.transform({ name: 'Untitled', mimeType: 'application/octet-stream' } as any)).toBe(
      'fa-file',
    );
  });
});
