import { TestBed } from '@angular/core/testing';
import { ChangelogPageComponent } from './changelog-page.component';

class MockAppwriteService {
  async getChangelogs() {
    return [{ date: '2025-01-01', changes: ['a', 'b'] }];
  }
}

describe('ChangelogPageComponent', () => {
  it('loads and renders changelogs', async () => {
    await TestBed.configureTestingModule({
      imports: [
        ChangelogPageComponent,
        (await import('@angular/router/testing')).RouterTestingModule,
      ],
      providers: [
        {
          provide: (await import('../../../core/services/appwrite.service')).AppwriteService,
          useClass: MockAppwriteService,
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ChangelogPageComponent);
    // trigger lifecycle (ngOnInit) and wait for async operations
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Changelog');
    expect(el.textContent).toContain('2025-01-01');
  });
});
