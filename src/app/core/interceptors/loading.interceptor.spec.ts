import { of, throwError } from 'rxjs';
import { loadingInterceptor } from './loading.interceptor';
import { TestBed } from '@angular/core/testing';
import { LoadingService } from '../services/loading.service';

describe('loadingInterceptor', () => {
  it('starts and stops loading on success', (done) => {
    const loading: any = { start: jest.fn(), stop: jest.fn() };
    TestBed.configureTestingModule({ providers: [{ provide: LoadingService, useValue: loading }] });

    const req: any = { url: '/api' };
    const next = jest.fn().mockReturnValue(of('ok'));

    const obs = TestBed.runInInjectionContext(() => loadingInterceptor(req, next as any));
    obs.subscribe((v: any) => {
      expect(v).toBe('ok');
      expect(loading.start).toHaveBeenCalled();
      Promise.resolve().then(() => {
        expect(loading.stop).toHaveBeenCalled();
        done();
      });
    });
  });

  it('stops loading on error', (done) => {
    const loading: any = { start: jest.fn(), stop: jest.fn() };
    TestBed.configureTestingModule({ providers: [{ provide: LoadingService, useValue: loading }] });

    const req: any = { url: '/api' };
    const next = jest.fn().mockReturnValue(throwError(() => new Error('fail')));

    const obs = TestBed.runInInjectionContext(() => loadingInterceptor(req, next as any));
    obs.subscribe({
      error: (err) => {
        expect(err).toBeInstanceOf(Error);
        expect(loading.start).toHaveBeenCalled();
        Promise.resolve().then(() => {
          expect(loading.stop).toHaveBeenCalled();
          done();
        });
      },
    });
  });
});
