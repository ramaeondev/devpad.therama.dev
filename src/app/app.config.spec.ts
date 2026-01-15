import { appConfig } from './app.config';
import type { ApplicationConfig } from '@angular/core';

describe('appConfig', () => {
  it('exports a providers array', () => {
    expect(Array.isArray((appConfig as ApplicationConfig).providers)).toBe(true);
  });

  it('contains provider-like entries (router/http/animations)', () => {
    const providers = (appConfig as ApplicationConfig).providers ?? [];
    // provider entries can be objects or provider factory functions; assert presence of at least one non-empty entry
    const hasProviderLike = providers.some(
      (p: unknown) => p !== undefined && (typeof p === 'object' || typeof p === 'function'),
    );
    expect(hasProviderLike).toBe(true);
  });
});
