import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { FileSizeDirective } from './file-size.directive';

@Component({
  template: `<span [appFileSize]="size"></span>`,
  standalone: true,
  imports: [FileSizeDirective],
})
class HostComponent {
  size?: any;
}

describe('FileSizeDirective', () => {
  it('displays Unknown size for undefined', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.size = undefined;
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('span');
    expect(el.textContent).toBe('Unknown size');
    expect(el.title).toBe('');
  });

  it('formats bytes -> KB and sets title', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.size = 2048; // 2 KB
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('span');
    expect(el.textContent).toBe('2.0 KB');
    expect(el.title).toBe('2048 bytes');
  });

  it('handles string input and large units', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.size = '1099511627776'; // 1 TB in bytes
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('span');
    expect(el.textContent.endsWith('TB')).toBe(true);
  });
});
