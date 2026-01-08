import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RelativeTimeDirective } from './relative-time.directive';

@Component({
  standalone: true,
  imports: [RelativeTimeDirective],
  template: `<span [appRelativeTime]="date"></span>`,
})
class HostComponent {
  date: Date = new Date();
}

describe('RelativeTimeDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let span: HTMLSpanElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    span = fixture.nativeElement.querySelector('span');
  });

  afterEach(() => {
    // Ensure clock is uninstalled if used
    try {
      (jasmine as any).clock().uninstall();
    } catch {}
  });

  function mockNow(date: Date) {
    (jasmine as any).clock().install();
    (jasmine as any).clock().mockDate(date);
  }

  it('shows "Now" for timestamps within the last minute', () => {
    const now = new Date(Date.UTC(2025, 10, 16, 12, 0, 0)); // Nov 16 2025 12:00 UTC
    mockNow(now);
    host.date = new Date(now.getTime() - 30 * 1000);
    fixture.detectChanges();

    expect(span.textContent?.trim()).toBe('Now');
    expect(span.title).toBe(host.date.toLocaleString());
  });

  it('shows Xm ago for timestamps between 1 and 59 minutes', () => {
    const now = new Date(Date.UTC(2025, 10, 16, 12, 0, 0));
    mockNow(now);
    host.date = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago
    fixture.detectChanges();

    expect(span.textContent?.trim()).toBe('5m ago');
  });

  it('shows 59m ago at 59 minutes in the past', () => {
    const now = new Date(Date.UTC(2025, 10, 16, 12, 0, 0));
    mockNow(now);
    host.date = new Date(now.getTime() - 59 * 60 * 1000);
    fixture.detectChanges();

    expect(span.textContent?.trim()).toBe('59m ago');
  });

  it('shows Today for times earlier the same day beyond 1 hour', () => {
    const now = new Date(Date.UTC(2025, 10, 16, 12, 0, 0));
    mockNow(now);
    host.date = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
    fixture.detectChanges();

    expect(span.textContent?.trim()).toBe('Today');
  });

  it('shows Yesterday for previous calendar day', () => {
    const now = new Date(Date.UTC(2025, 10, 16, 12, 0, 0));
    mockNow(now);
    host.date = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Yesterday
    fixture.detectChanges();

    expect(span.textContent?.trim()).toBe('Yesterday');
  });

  it('shows This week for dates within current week but not today/yesterday', () => {
    const wednesday = new Date(Date.UTC(2025, 10, 19, 12, 0, 0)); // Wed Nov 19 2025
    mockNow(wednesday);
    host.date = new Date(wednesday.getTime() - 2 * 24 * 60 * 60 * 1000); // Monday of same week
    fixture.detectChanges();

    expect(span.textContent?.trim()).toBe('This week');
  });

  it('shows This month for earlier days in the same month beyond a week', () => {
    const now = new Date(Date.UTC(2025, 10, 16, 12, 0, 0)); // Nov 16
    mockNow(now);
    host.date = new Date(Date.UTC(2025, 10, 4, 12, 0, 0)); // Nov 4 (12 days earlier)
    fixture.detectChanges();

    expect(span.textContent?.trim()).toBe('This month');
  });

  it('shows month name for same year different month', () => {
    const now = new Date(Date.UTC(2025, 10, 16, 12, 0, 0)); // Nov 16 2025
    mockNow(now);
    host.date = new Date(Date.UTC(2025, 1, 10, 12, 0, 0)); // Feb 10 2025
    fixture.detectChanges();

    expect(span.textContent?.trim()).toBe('Feb');
  });

  it('shows year for a different year', () => {
    const now = new Date(Date.UTC(2025, 10, 16, 12, 0, 0));
    mockNow(now);
    host.date = new Date(Date.UTC(2024, 10, 16, 12, 0, 0)); // Nov 16 2024
    fixture.detectChanges();

    expect(span.textContent?.trim()).toBe('2024');
  });

  it('auto-updates from Now to 1m ago after a minute (via Jest timers)', () => {
    // Use Jest modern fake timers for deterministic timer control
    // Use typed config to satisfy TypeScript: legacyFakeTimers=false selects modern timers
    jest.useFakeTimers({ legacyFakeTimers: false });
    const now = new Date(Date.UTC(2025, 10, 16, 12, 0, 0));
    const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);

    // Set system time and create component
    jest.setSystemTime(now);
    host.date = thirtySecondsAgo;
    fixture.detectChanges();

    expect(span.textContent?.trim()).toBe('Now');

    // Advance system time by 60 seconds and explicitly refresh the directive
    const futureTime = new Date(now.getTime() + 60 * 1000);
    jest.setSystemTime(futureTime);

    // Grab the directive instance and call its update directly to avoid timer semantics
    const de = fixture.debugElement.query(By.directive(RelativeTimeDirective));
    const directiveInstance = de.injector.get(RelativeTimeDirective) as any;
    directiveInstance.updateDisplay?.();
    fixture.detectChanges();

    expect(span.textContent?.trim()).toBe('1m ago');

    // Restore real timers
    jest.useRealTimers();
  });
});
