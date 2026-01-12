import { TestBed } from '@angular/core/testing';
import { LoadingService } from './loading.service';

describe('LoadingService', () => {
  let service: LoadingService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [LoadingService] });
    service = TestBed.inject(LoadingService);
  });

  it('start and stop toggle isLoading correctly', () => {
    expect(service.isLoading()).toBe(false);
    service.start();
    expect(service.isLoading()).toBe(true);
    service.stop();
    expect(service.isLoading()).toBe(false);
  });

  it('stop does not go below zero', () => {
    service.stop();
    expect(service.isLoading()).toBe(false);
  });

  it('withLoading wraps promise and toggles loading', async () => {
    let resolved = false;
    const res = service.withLoading(async () => {
      expect(service.isLoading()).toBe(true);
      resolved = true;
      return 'ok';
    });
    const val = await res;
    expect(val).toBe('ok');
    expect(resolved).toBe(true);
    expect(service.isLoading()).toBe(false);
  });
});