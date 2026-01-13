import { Page } from '@playwright/test';

export async function stubEmptyNotes(page: Page) {
  await page.route('**/rest/v1/notes*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });
}

export async function stubNotesWithList(page: Page, notes: any[]) {
  await page.route('**/rest/v1/notes*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(notes),
    });
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
  await page.addInitScript((s) => {
    localStorage.setItem('sb-auth-token', s);
  }, JSON.stringify(sessionObject));
}
