import { TestBed } from '@angular/core/testing';
import { ConfirmModalComponent } from './confirm-modal.component';

describe('ConfirmModalComponent', () => {
  it('renders title/message and emits events', async () => {
    await TestBed.configureTestingModule({ imports: [ConfirmModalComponent] }).compileComponents();
    const fixture = TestBed.createComponent(ConfirmModalComponent);
    const comp = fixture.componentInstance;
    const cancelSpy = jest.fn();
    const confirmSpy = jest.fn();
    comp.cancel.subscribe(cancelSpy as any);
    comp.confirm.subscribe(confirmSpy as any);

    fixture.detectChanges();
    const cancelBtn = fixture.nativeElement.querySelector('button:nth-of-type(1)');
    const confirmBtn = fixture.nativeElement.querySelector('button:nth-of-type(2)');

    cancelBtn.click();
    expect(cancelSpy).toHaveBeenCalled();

    confirmBtn.click();
    expect(confirmSpy).toHaveBeenCalled();
  });
});
