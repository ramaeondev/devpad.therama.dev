import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { IconDirective } from './icon.directive';
import { By } from '@angular/platform-browser';

@Component({
  standalone: true,
  imports: [IconDirective],
  template: `<div [appIcon]="name" [size]="size"></div>`,
})
class HostComponent {
  name?: string;
  size?: number | string;
}

describe('IconDirective', () => {
  let fixture: any;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, IconDirective, HostComponent],
    });
    fixture = TestBed.createComponent(HostComponent);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('does nothing when name is empty', () => {
    const el = fixture.debugElement.query(By.css('div'));
    fixture.detectChanges();
    expect(el.nativeElement.innerHTML).toBe('');
    // No HTTP requests
  });

  it('renders svg and sets svg width/height when size provided', () => {
    const host = fixture.componentInstance as HostComponent;
    const el = fixture.debugElement.query(By.css('div'));

    host.name = 'sample';
    host.size = 24;
    fixture.detectChanges();

    const req = httpMock.expectOne('icons/sample.svg');
    req.flush('<svg></svg>', { status: 200, statusText: 'OK' });

    fixture.detectChanges();

    expect(el.nativeElement.innerHTML).toContain('<svg');
    const svgEl = el.nativeElement.querySelector('svg');
    expect(svgEl).toBeTruthy();
    expect(svgEl.getAttribute('width')).toBe('24px');
    expect(svgEl.getAttribute('height')).toBe('24px');
  });

  it('falls back to png when svg fetch fails', () => {
    const host = fixture.componentInstance as HostComponent;
    const el = fixture.debugElement.query(By.css('div'));

    host.name = 'missing';
    fixture.detectChanges();

    const req = httpMock.expectOne('icons/missing.svg');
    req.flush('', { status: 404, statusText: 'Not Found' });

    fixture.detectChanges();

    const img = el.nativeElement.querySelector('img');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toContain('icons/missing.png');
    expect(img.style.width).toBe('100%');
    expect(img.style.height).toBe('100%');
  });
});
