import { Directive, Input, OnChanges } from '@angular/core';
import { FILE_ICONS_REGISTRY } from './file-icons';

@Directive({
  selector: 'ng-icon[fileIcon]',
  standalone: true,
})
export class FileIconDirective implements OnChanges {
  @Input() fileIcon: string = '';

  ngOnChanges() {
    const ext = this.extractExtension(this.fileIcon);
    const iconName = this.matchIcon(ext);
    (this as any).name = iconName; // apply to ng-icon
  }

  private extractExtension(file: string): string {
    if (!file.includes('.')) return file.toLowerCase();
    return file.split('.').pop()!.toLowerCase();
  }

  private matchIcon(ext: string): string {
    const formatted = 'mf' + ext.charAt(0).toUpperCase() + ext.slice(1);

    if (FILE_ICONS_REGISTRY[formatted]) return formatted;

    if (FILE_ICONS_REGISTRY['mfFile']) return 'mfFile';
    if (FILE_ICONS_REGISTRY['mfFolder']) return 'mfFolder';

    return 'mfFile';
  }
}