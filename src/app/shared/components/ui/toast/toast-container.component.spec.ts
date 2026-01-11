import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ToastContainerComponent } from './toast-container.component';

class MockToastService {
  private _toasts = signal([{ id: '1', type: 'info', message: 'Hello' }]);
  toastList() {
    return this._toasts();
  }
  remove(id: string) {
    this._toasts.set(this._toasts().filter((t) => t.id !== id));
  }
}

describe('ToastContainerComponent', () => {
  it('renders toasts and dismiss works', async () => {
    await TestBed.configureTestingModule({
      imports: [ToastContainerComponent],
      providers: [
        {
          provide: (await import('../../../../core/services/toast.service')).ToastService,
          useClass: MockToastService,
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ToastContainerComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Hello');

    const button = fixture.nativeElement.querySelector('button[aria-label="Dismiss notification"]');
    expect(button).not.toBeNull();
    button.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Hello');
  });
});
