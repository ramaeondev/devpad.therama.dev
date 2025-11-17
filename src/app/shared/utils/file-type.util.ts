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

export function getIconNameFromExt(ext: string): string {
  const map: Record<string, string> = {
    pdf: 'pdf-icon',
    doc: 'doc-icon',
    docx: 'docx-icon',
    xls: 'xls-icon',
    xlsx: 'xlsx-icon',
    xlsm: 'xlsm-icon',
    xla: 'xla-icon',
    xlam: 'xlam-icon',
    xlt: 'xlt-icon',
    xltm: 'xltm-icon',
    xltx: 'xltx-icon',
    csv: 'csv-icon',
    ppt: 'ppt-icon',
    pptx: 'pptx-icon',
    pot: 'pot-icon',
    potx: 'potx-icon',
    ppsx: 'ppsx-icon',
    txt: 'txt-icon',
    md: 'markdown-icon',
    markdown: 'markdown-icon',
    jpg: 'jpg-icon',
    jpeg: 'jpeg-icon',
    gif: 'gif-icon',
  };
  if (map[ext]) return map[ext];
  if (ext.startsWith('xl')) return 'excel-icon';
  if (ext.startsWith('ppt')) return 'ppt-icon';
  if (ext.startsWith('doc')) return 'doc-icon';
  return 'doc-icon';
}

export function getIconNameFromMime(mime: string): string {
  const m = (mime || '').toLowerCase();
  if (!m) return 'doc-icon';
  if (m.includes('spreadsheet')) return 'excel-icon';
  if (m.includes('presentation')) return 'ppt-icon';
  if (m.includes('document')) return 'doc-icon';
  if (m.includes('pdf')) return 'pdf-icon';
  if (m.includes('image')) return 'jpg-icon';
  return 'doc-icon';
}

export function getIconNameFromNameAndMime(name?: string, mime?: string): string {
  const ext = getExtensionFromPath(name ?? '');
  if (ext) return getIconNameFromExt(ext);
  if (mime) return getIconNameFromMime(mime);
  return 'doc-icon';
}
