import { appConfig } from './app.config';

describe('appConfig', () => {
  it('exports a providers array', () => {
    expect(Array.isArray((appConfig as any).providers)).toBe(true);
  });

  it('contains provider-like entries (router/http/animations)', () => {
    const providers: any[] = (appConfig as any).providers;
    // provider entries can be objects or provider factory functions; assert presence of at least one non-empty entry
    const hasProviderLike = providers.some((p) => p !== undefined && (typeof p === 'object' || typeof p === 'function'));
    expect(hasProviderLike).toBe(true);
  });
});
