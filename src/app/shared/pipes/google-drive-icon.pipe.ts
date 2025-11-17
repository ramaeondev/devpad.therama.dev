import { Pipe, PipeTransform } from '@angular/core';
import { getExtensionFromPath, getIconNameFromExt } from '../utils/file-type.util';
import { GoogleDriveFile } from '../../core/models/integration.model';

@Pipe({
  name: 'googleDriveIcon',
  standalone: true,
})
export class GoogleDriveIconPipe implements PipeTransform {
  transform(file: GoogleDriveFile | null): string {
    if (!file) {
      return 'doc-icon'; // Default icon
    }

    const ext = getExtensionFromPath(file.name);
    if (ext) {
      const icon = getIconNameFromExt(ext);
      if (icon !== 'doc-icon') {
        return icon;
      }
    }

    // Fallback to MIME type if extension doesn't give a specific icon
    const mt = file.mimeType || '';
    if (mt.includes('vnd.google-apps.document')) return 'docx-icon';
    if (mt.includes('vnd.google-apps.spreadsheet')) return 'xlsx-icon';
    if (mt.includes('vnd.google-apps.presentation')) return 'pptx-icon';
    if (mt.includes('pdf')) return 'pdf-icon';
    if (mt.startsWith('image/')) return 'jpg-icon';

    // If we got an extension but it was generic, try family fallbacks
    if (ext) {
        if (ext.startsWith('xl')) return 'excel-icon';
        if (ext.startsWith('ppt')) return 'ppt-icon';
        if (ext.startsWith('doc')) return 'doc-icon';
    }

    return 'doc-icon'; // Final fallback
  }
}
