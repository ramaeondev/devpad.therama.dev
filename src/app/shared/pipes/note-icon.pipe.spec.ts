import { NoteIconPipe } from './note-icon.pipe';

describe('NoteIconPipe', () => {
  const pipe = new NoteIconPipe();

  it('returns default for null', () => {
    expect(pipe.transform(null)).toBe('fa-file');
  });

  it('returns file icon for storage paths', () => {
    expect(pipe.transform({ content: 'storage://foo.pdf' })).toBe('fa-file-pdf');
    expect(pipe.transform({ content: 'storage://bar' })).toBe('fa-file');
  });

  it('returns markdown icon for plain notes', () => {
    expect(pipe.transform({ content: undefined })).toBe('fa-file-lines');
    expect(pipe.transform({})).toBe('fa-file-lines');
  });
});
