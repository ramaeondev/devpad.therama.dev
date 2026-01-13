import {
  DestroyRef,
  Directive,
  ElementRef,
  Input,
  Renderer2,
  effect,
  inject,
  signal,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap } from 'rxjs';

@Directive({
  selector: '[appIcon]',
  standalone: true,
})
export class IconDirective {
  private el = inject(ElementRef<HTMLElement>);
  private renderer = inject(Renderer2);
  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);

  private nameSig = signal<string>('');
  private sizeSig = signal<number | string | undefined>(undefined);

  @Input('appIcon')
  set name(val: string | undefined) {
    this.nameSig.set((val || '').trim());
  }

  @Input()
  set size(val: number | string | undefined) {
    this.sizeSig.set(val);
  }

  constructor() {
    effect(() => {
      this.render(this.nameSig(), this.sizeSig());
    });
  }

  private render(name: string, size?: number | string) {
    this.renderer.setProperty(this.el.nativeElement, 'innerHTML', '');

    if (size !== undefined) {
      const sizeStr = typeof size === 'number' ? `${size}px` : String(size);
      this.renderer.setStyle(this.el.nativeElement, 'width', sizeStr);
      this.renderer.setStyle(this.el.nativeElement, 'height', sizeStr);
      this.renderer.setStyle(this.el.nativeElement, 'display', 'inline-block');
    }

    if (!name) return;

    const svgPath = `icons/${name}.svg`;
    const pngPath = `icons/${name}.png`;

    this.http
      .get(svgPath, { responseType: 'text' })
      .pipe(
        catchError(() => of(null)),
        switchMap((svg: string | null) => {
          if (svg) return of(svg);
          const img = this.renderer.createElement('img');
          this.renderer.setAttribute(img, 'src', pngPath);
          this.renderer.setStyle(img, 'width', '100%');
          this.renderer.setStyle(img, 'height', '100%');
          this.renderer.appendChild(this.el.nativeElement, img);
          return of(null);
        }),
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((svg: string | null) => {
        if (!svg) return;
        this.renderer.setProperty(this.el.nativeElement, 'innerHTML', svg);
        const svgEl = this.el.nativeElement.querySelector('svg') as SVGElement | null;
        const currentSize = this.sizeSig();
        if (svgEl && currentSize) {
          const sizeStr =
            typeof currentSize === 'number' ? `${currentSize}px` : String(currentSize);
          this.renderer.setAttribute(svgEl, 'width', sizeStr);
          this.renderer.setAttribute(svgEl, 'height', sizeStr);
        }
      });
  }
}
