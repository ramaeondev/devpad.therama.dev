import { TestBed } from '@angular/core/testing';
import { AvatarComponent } from './avatar.component';

describe('AvatarComponent', () => {
  it('renders initials when no avatarUrl and names provided', async () => {
    await TestBed.configureTestingModule({ imports: [AvatarComponent] }).compileComponents();
    const fixture = TestBed.createComponent(AvatarComponent);
    const comp = fixture.componentInstance;
    comp.firstName = 'Alice';
    comp.lastName = 'Smith';
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('AS');
  });

  it('shows image when avatarUrl is provided', async () => {
    await TestBed.configureTestingModule({ imports: [AvatarComponent] }).compileComponents();
    const fixture = TestBed.createComponent(AvatarComponent);
    const comp = fixture.componentInstance;
    comp.avatarUrl = 'https://example.com/a.png';
    fixture.detectChanges();
    const img = fixture.nativeElement.querySelector('img');
    expect(img).not.toBeNull();
    expect(img.getAttribute('src')).toBe('https://example.com/a.png');
  });
});