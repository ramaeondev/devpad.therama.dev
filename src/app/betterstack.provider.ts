import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { environment } from '../environments/environment';

function initBetterstack(): void {
  if (!environment.production) return; // only enable in production by default
  const key = environment.BETTERSTACK_RUM_KEY;
  if (!key) return;

  // Basic RUM script injection. Replace with official snippet if needed.
  try {
    if (typeof document !== 'undefined') {
      const script = document.createElement('script');
      script.async = true;
      // This URL may need to be adjusted to the official BetterStack RUM script URL.
      script.src = `https://rum.betterstack.com/rum.js?client_key=${encodeURIComponent(key)}`;
      document.head.appendChild(script);
      // Optionally expose a small helper on globalThis
      (globalThis as any).__betterstack = (globalThis as any).__betterstack || {};
      (globalThis as any).__betterstack.service = environment.BETTERSTACK_SERVICE_NAME || 'devpad';
    }
  } catch (err) {
    // Do not break the app if RUM injection fails
    // eslint-disable-next-line no-console
    console.warn('Betterstack RUM init failed', err);
  }
}

export function provideBetterstack(): EnvironmentProviders {
  // Run initialization eagerly via side-effect
  initBetterstack();
  return makeEnvironmentProviders([]);
}
