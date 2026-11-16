import { TestBed } from '@angular/core/testing';
import { SocialLinksComponent } from './social-links.component';

class MockStaticData { async getSocialLinks() { return [{ $id: '1', url: 'https://x', icon: 'fa', display_name: 'X' }]; } }
class MockStaticDataError { async getSocialLinks() { throw new Error('fail'); } }

describe('SocialLinksComponent', () => {
  it('renders links when present', async () => {
    await TestBed.configureTestingModule({ imports: [SocialLinksComponent], providers: [{ provide: (await import('../../../core/services/static-data.service')).StaticDataService, useClass: MockStaticData }] }).compileComponents();
    const fixture = TestBed.createComponent(SocialLinksComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('a.social-link').length).toBe(1);
  });

  it('shows error state when fetch fails', async () => {
    await TestBed.configureTestingModule({ imports: [SocialLinksComponent], providers: [{ provide: (await import('../../../core/services/static-data.service')).StaticDataService, useClass: MockStaticDataError }] }).compileComponents();
    const fixture = TestBed.createComponent(SocialLinksComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Unable to load social links');
  });
});