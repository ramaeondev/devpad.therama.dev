import { Directive, ElementRef, Input, OnChanges, SimpleChanges, inject } from '@angular/core';

@Directive({
  selector: '[appFileSize]',
  standalone: true,
})
export class FileSizeDirective implements OnChanges {
  @Input('appFileSize') size?: string | number;

  private el = inject(ElementRef<HTMLElement>);

  ngOnChanges(_changes: SimpleChanges): void {
    const text = this.format(this.size);
    this.el.nativeElement.textContent = text;
    this.el.nativeElement.title = typeof this.size === 'number' ? `${this.size} bytes` : `${this.size ?? ''}`;
  }

  private format(size?: string | number): string {
    if (size === undefined || size === null || size === '') return 'Unknown size';
    const sizeNum = typeof size === 'string' ? parseInt(size, 10) : size;
    if (isNaN(sizeNum)) return 'Unknown size';
    if (sizeNum < 1024) return `${sizeNum} B`;
    if (sizeNum < 1024 * 1024) return `${(sizeNum / 1024).toFixed(1)} KB`;
    if (sizeNum < 1024 * 1024 * 1024) return `${(sizeNum / (1024 * 1024)).toFixed(1)} MB`;
    if (sizeNum < 1024 * 1024 * 1024 * 1024) return `${(sizeNum / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    return `${(sizeNum / (1024 * 1024 * 1024 * 1024)).toFixed(1)} TB`;
  }
}
