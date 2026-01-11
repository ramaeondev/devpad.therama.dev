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

  it('initials uses first two letters when lastName missing', async () => {
    await TestBed.configureTestingModule({ imports: [AvatarComponent] }).compileComponents();
    const fixture = TestBed.createComponent(AvatarComponent);
    const comp = fixture.componentInstance;
    comp.firstName = 'Zoë';
    comp.lastName = '';
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('ZO');
  });

  it('initials uses email when no names provided', async () => {
    await TestBed.configureTestingModule({ imports: [AvatarComponent] }).compileComponents();
    const fixture = TestBed.createComponent(AvatarComponent);
    const comp = fixture.componentInstance;
    comp.email = 'bob@example.com';
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('B');
  });

  it('initials returns ? when no name or email present', async () => {
    await TestBed.configureTestingModule({ imports: [AvatarComponent] }).compileComponents();
    const fixture = TestBed.createComponent(AvatarComponent);
    const comp = fixture.componentInstance;
    comp.firstName = '';
    comp.lastName = '';
    comp.email = '';
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('?');
  });

  it('avatarClasses respects size mapping', async () => {
    await TestBed.configureTestingModule({ imports: [AvatarComponent] }).compileComponents();
    const fixture = TestBed.createComponent(AvatarComponent);
    const comp = fixture.componentInstance;
    comp.size = 'xl';
    expect(comp.avatarClasses()).toBe('w-16 h-16 text-lg');
  });
});
