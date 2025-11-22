export function getExtensionFromPath(input: string | null | undefined): string {
  if (!input) return '';
  try {
    // Strip known prefixes like storage:// and query params
    const cleaned = input.replace(/^storage:\/\//, '');
    const withoutQuery = cleaned.split('?')[0];
    const filename = withoutQuery.split('/').pop() || '';
    return filename.split('.').pop()?.toLowerCase() || '';
  } catch {
    const parts = String(input).split('?')[0].split('.');
    return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
  }
}

export function getTypeLabelFromExt(ext: string): string {
  switch (ext) {
    case 'doc':
    case 'docx':
      return 'Word';
    case 'xls':
    case 'xlsx':
    case 'xlsm':
    case 'xlt':
    case 'xltm':
    case 'xltx':
    case 'xla':
    case 'xlam':
    case 'csv':
      return 'Excel';
    case 'ppt':
    case 'pptx':
    case 'pot':
    case 'potx':
    case 'ppsx':
      return 'PowerPoint';
    case 'pdf':
      return 'PDF';
    case 'txt':
      return 'Text';
    case 'md':
    case 'markdown':
      return 'Markdown';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
    case 'svg':
      return 'Image';
    case 'mp4':
    case 'avi':
    case 'mov':
    case 'webm':
    case 'mkv':
      return 'Video';
    case 'mp3':
    case 'wav':
    case 'ogg':
    case 'flac':
    case 'm4a':
      return 'Audio';
    case 'zip':
    case 'rar':
      return 'Archive';
    default:
      return 'Document';
  }
}

// Font Awesome icon imports (to be imported in the file or a shared icons file)
// import { faFilePdf, faFileWord, faFileExcel, faFilePowerpoint, faFileImage, faFileAudio, faFileVideo, faFileArchive, faFileAlt, faFileCsv, faFile } from '@fortawesome/free-solid-svg-icons';

// For now, return string names for FA icons. Later, replace with actual icon objects after FA integration.
export function getIconNameFromExt(ext: string): string {
  switch (ext) {
    case 'pdf':
      return 'fa-file-pdf';
    case 'doc':
    case 'docx':
      return 'fa-file-word';
    case 'xls':
    case 'xlsx':
    case 'xlsm':
    case 'xlt':
    case 'xltm':
    case 'xltx':
    case 'xla':
    case 'xlam':
      return 'fa-file-excel';
    case 'csv':
      return 'fa-file-csv';
    case 'ppt':
    case 'pptx':
    case 'pot':
    case 'potx':
    case 'ppsx':
      return 'fa-file-powerpoint';
    case 'txt':
      return 'fa-file-lines';
    case 'md':
    case 'markdown':
      return 'fa-file-lines';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
    case 'svg':
      return 'fa-file-image';
    case 'mp4':
    case 'avi':
    case 'mov':
    case 'webm':
    case 'mkv':
      return 'fa-file-video';
    case 'mp3':
    case 'wav':
    case 'ogg':
    case 'flac':
    case 'm4a':
      return 'fa-file-audio';
    case 'zip':
    case 'rar':
      return 'fa-file-zipper';
    default:
      return 'fa-file';
  }
}

export function getIconNameFromMime(mime: string): string {
  const m = (mime || '').toLowerCase();
  if (!m) return 'fa-file';
  if (m.includes('spreadsheet')) return 'fa-file-excel';
  if (m.includes('presentation')) return 'fa-file-powerpoint';
  if (m.includes('document')) return 'fa-file-word';
  if (m.includes('pdf')) return 'fa-file-pdf';
  if (m.includes('image')) return 'fa-file-image';
  return 'fa-file';
}

export function getIconNameFromNameAndMime(name?: string, mime?: string): string {
  const ext = getExtensionFromPath(name ?? '');
  if (ext) return getIconNameFromExt(ext);
  if (mime) return getIconNameFromMime(mime);
  return 'fa-file';
}
