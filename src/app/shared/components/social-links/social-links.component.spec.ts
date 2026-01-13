import { TestBed } from '@angular/core/testing';
import { SocialLinksComponent } from './social-links.component';

class MockAppwrite {
  async getSocialLinks() {
    return [{ $id: '1', url: 'https://x', icon: 'fa', display_name: 'X' }];
  }
}
class MockAppwriteError {
  async getSocialLinks() {
    throw new Error('fail');
  }
}

describe('SocialLinksComponent', () => {
  it('renders links when present', async () => {
    await TestBed.configureTestingModule({
      imports: [SocialLinksComponent],
      providers: [
        {
          provide: (await import('../../../core/services/appwrite.service')).AppwriteService,
          useClass: MockAppwrite,
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(SocialLinksComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('a.social-link').length).toBe(1);
  });

  it('shows error state when fetch fails', async () => {
    await TestBed.configureTestingModule({
      imports: [SocialLinksComponent],
      providers: [
        {
          provide: (await import('../../../core/services/appwrite.service')).AppwriteService,
          useClass: MockAppwriteError,
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(SocialLinksComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Unable to load social links');
  });
});
