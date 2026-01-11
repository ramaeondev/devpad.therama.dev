import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    jest.useFakeTimers();
    TestBed.configureTestingModule({ providers: [ToastService] });
    service = TestBed.inject(ToastService);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('show adds a toast and remove deletes it', () => {
    service.show('success', 'OK', 0);
    const list = service.toastList();
    expect(list.length).toBe(1);

    const id = list[0].id;
    service.remove(id);
    expect(service.toastList().length).toBe(0);
  });

  it('auto removes toast after duration', () => {
    service.show('info', 'auto', 1000);
    expect(service.toastList().length).toBe(1);
    jest.advanceTimersByTime(1000);
    expect(service.toastList().length).toBe(0);
  });

  it('helper methods call show with correct type', () => {
    const spy = jest.spyOn(service as any, 'show');
    service.success('s');
    service.error('e');
    service.info('i');
    service.warning('w');
    expect(spy).toHaveBeenCalledTimes(4);
  });
});
