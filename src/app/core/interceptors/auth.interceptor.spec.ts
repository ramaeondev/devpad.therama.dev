import { of } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { environment as env } from '../../../environments/environment';

describe('authInterceptor', () => {

  afterEach(() => {
    // reset to default to avoid cross-test contamination
    env.supabase = env.supabase || { url: '' };
  });

  it('lets Supabase URLs pass through unchanged', (done) => {
    env.supabase = { url: 'https://api.test' } as any;

    const req: any = { url: 'https://api.test/storage/v1' };
    const next = jest.fn().mockReturnValue(of('ok'));

    const obs = authInterceptor(req, next as any);
    obs.subscribe((v: any) => {
      expect(v).toBe('ok');
      expect(next).toHaveBeenCalledWith(req);
      done();
    });
  });

  it('passes through non-Supabase requests', (done) => {
    env.supabase = { url: 'https://api.test' } as any;

    const req: any = { url: '/api/local' };
    const next = jest.fn().mockReturnValue(of('ok'));

    const obs = authInterceptor(req, next as any);
    obs.subscribe((v: any) => {
      expect(v).toBe('ok');
      expect(next).toHaveBeenCalledWith(req);
      done();
    });
  });
});
