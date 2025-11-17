import { Pipe, PipeTransform } from '@angular/core';
import { getExtensionFromPath, getIconNameFromExt } from '../utils/file-type.util';

@Pipe({
  name: 'noteIcon',
  standalone: true,
})
export class NoteIconPipe implements PipeTransform {
  transform(note: any): string {
    if (!note) {
      return getIconNameFromExt('');
    }

    // If content is a storage path, derive icon from the path's extension
    if (note.content && typeof note.content === 'string' && note.content.startsWith('storage://')) {
      const ext = getExtensionFromPath(note.content);
      return getIconNameFromExt(ext);
    }

    // Otherwise, it's a standard markdown note
    return getIconNameFromExt('md');
  }
}
