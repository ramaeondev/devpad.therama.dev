import { Page } from '@playwright/test';

export async function stubEmptyNotes(page: Page) {
  await page.context().route('**/rest/v1/notes*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });
}

export async function stubNotesWithList(page: Page, notes: any[]) {
  await page.context().route('**/rest/v1/notes*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(notes),
    });
  });
}

export async function stubFoldersWithList(page: Page, folders: any[]) {
  await page.context().route('**/rest/v1/folders*', async (route) => {
    const req = route.request();
    // For GET queries, return the provided folders
    if (req.method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(folders) });
      return;
    }
    // For other methods, return empty success
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
  });
}

export async function stubAuthSession(page: Page, user = { id: 'u1', email: 'e2e@example.com' }) {
  // Persist a supabase-like session in localStorage under the storageKey configured in SupabaseService (sb-auth-token)
  const sessionObject = {
    provider: null,
    currentSession: {
      access_token: 'e2e-access-token',
      refresh_token: 'e2e-refresh',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'bearer',
      user: user,
    },
    user: user,
  };

  // Add both localStorage token + a small supabase shim exposed to the page to avoid NavigatorLock issues
  await page.addInitScript((s, u) => {
    localStorage.setItem('sb-auth-token', s);
    (window as any).__E2E_USER = JSON.parse(s).user;

    // Lightweight shim for E2E to avoid calling real supabase storage APIs which may cause NavigatorLock issues
    (window as any).__E2E_SUPABASE = {
      auth: {
        getSession: async () => ({ data: { session: JSON.parse(s) }, error: null }),
        getUser: async () => ({ data: { user: u }, error: null }),
      },
      // Other simple helpers can be added if tests need them
    };
  }, JSON.stringify(sessionObject), user);
}

/**
 * Generic RPC stubs: ensures any RPC request (including preflight OPTIONS) is handled in tests
 */
export async function stubRpcEndpoints(page: Page) {
  await page.context().route('**/rpc/*', async (route) => {
    const req = route.request();
    const url = req.url();
    const method = req.method();

    // Fulfill OPTIONS preflight to avoid CORS/preflight 502 failures
    if (method === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        },
        body: '',
      });
      return;
    }

    // Specific RPC: track_share_access used by public-note flow — return 200 quickly
    if (url.includes('track_share_access')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
      return;
    }

    // Generic RPC: return empty array/object as a safe fallback
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });
}

/**
 * Stub analytics/track endpoints (some apps send to /track or /collect)
 */
export async function stubAnalytics(page: Page) {
  await page.context().route('**/track*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
  });
  await page.context().route('**/collect*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
  });
}

/**
 * Generic fallback for REST endpoints under /rest/v1 to avoid calling prod APIs during tests.
 * Use carefully — add more specific stubs before calling this if you need non-empty fixtures.
 */
export async function stubRestFallback(page: Page) {
  // First, attempt to intercept via Playwright routes at context level (works for most fetch/XHR)
  await page.context().route('**/rest/v1/*', async (route) => {
    const req = route.request();
    const method = req.method();
    const url = req.url();

    // If caller requested notes but a specific stub will handle it elsewhere, return empty array by default
    if (method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      return;
    }

    // For POST/PATCH/PUT/DELETE return generic success object
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
  });

  // For any requests initiated before routes were installed or via other contexts (service workers, etc.),
  // provide a lightweight fetch monkeypatch that handles known API patterns.
  await page.addInitScript(() => {
    if ((window as any).__E2E_FETCH_PATCHED) return;
    const originalFetch = window.fetch.bind(window);
    (window as any).__original_fetch = originalFetch;

    (window as any).__E2E_FETCH_PATCHED = true;
    window.fetch = async (input: RequestInfo, init?: RequestInit) => {
      try {
        const url = typeof input === 'string' ? input : input.url;
        // Only catch our production API host and certain paths
        if (url.includes('api-prod.therama.dev') && (url.includes('/rest/v1/') || url.includes('/rpc/'))) {
          const method = init?.method || (typeof input === 'string' ? 'GET' : (input as Request).method);

          // OPTIONS preflight
          if (method === 'OPTIONS') {
            return new Response('', { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' } });
          }

          // track_share_access RPC quick reply
          if (url.includes('track_share_access')) {
            return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
          }

          // default fallback: empty array or object based on method
          if (method === 'GET') {
            return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
          }
          return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
      } catch (e) {
        // fall through to original fetch on unexpected errors
      }
      return originalFetch(input, init);
    };
  });
}
