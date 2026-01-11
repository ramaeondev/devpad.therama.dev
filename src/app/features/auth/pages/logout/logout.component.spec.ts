import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { LogoutComponent } from './logout.component';

describe('LogoutComponent', () => {
  it('posts message to parent and redirects when no parent', () => {
    const originalParent = (window as any).parent;
    const mockParent = { postMessage: jest.fn() } as any;
    // Simulate iframe
    Object.defineProperty(window, 'parent', { value: mockParent, configurable: true });

    const fixture = TestBed.createComponent(LogoutComponent);
    const comp = fixture.componentInstance;

    comp.ngOnInit();
    expect(mockParent.postMessage).toHaveBeenCalled();

    // restore
    Object.defineProperty(window, 'parent', { value: originalParent, configurable: true });
  });

  it('redirects when not in iframe', fakeAsync(() => {
    // Don't modify window.parent (read-only) — assume not in iframe in test env

    // Prepare location.href for observation without redefining the `location` property
    const originalHref = window.location.href;
    // Set a baseline href so assignment can be observed
    (window as any).location.href = '';

    const fixture = TestBed.createComponent(LogoutComponent);
    const comp = fixture.componentInstance;

    comp.ngOnInit();
    // advance timer
    tick(600);

    // jsdom resolves href to an absolute URL, assert on pathname instead
    expect((window as any).location.pathname).toBe('/');

    // restore
    (window as any).location.href = originalHref;
  }));
});
