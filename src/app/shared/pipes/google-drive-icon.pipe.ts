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
      return 'fa-file'; // Default icon
    }
    const ext = getExtensionFromPath(file.name);
    if (ext) {
      return getIconNameFromExt(ext);
    }
    // Fallback to MIME type if extension doesn't give a specific icon
    const mt = file.mimeType || '';
    if (mt.includes('vnd.google-apps.document')) return 'fa-file-word';
    if (mt.includes('vnd.google-apps.spreadsheet')) return 'fa-file-excel';
    if (mt.includes('vnd.google-apps.presentation')) return 'fa-file-powerpoint';
    if (mt.includes('pdf')) return 'fa-file-pdf';
    if (mt.startsWith('image/')) return 'fa-file-image';
    return 'fa-file'; // Final fallback
  }
}
