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

    // Spy on location.href assignment
    const originalHref = window.location.href;
    const mockLocation: any = { href: '' };
    Object.defineProperty(window, 'location', { value: mockLocation, configurable: true });

    const fixture = TestBed.createComponent(LogoutComponent);
    const comp = fixture.componentInstance;

    comp.ngOnInit();
    // advance timer
    tick(600);

    expect((window as any).location.href).toBe('/');

    // restore
    Object.defineProperty(window, 'location', { value: { href: originalHref }, configurable: true });
  }));
});
