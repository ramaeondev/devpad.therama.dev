import { test, expect } from '@playwright/test';

test('public shared note loads and displays content', async ({ page }) => {
  // Log requests and errors for debugging
  page.on('request', (req) => {
    console.log('[E2E REQ]', req.method(), req.url());
  });
  page.on('console', (msg) => console.log('[PAGE LOG]', msg.text()));
  page.on('pageerror', (err) => console.log('[PAGE ERROR]', err.message));

  // Stub public_shares query
  await page.route('**/rest/v1/public_shares*', async (route) => {
    console.log('[E2E STUB] public_shares matched for', route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'share-1',
        user_id: 'u1',
        note_id: 'note-1',
        share_token: 'token123',
        permission: 'readonly',
        view_count: 1,
        unique_view_count: 1,
        note_title: 'Public Note Title'
      }),
    });
  });

  // Stub RPC get_shared_note
  await page.route('**/rpc/get_shared_note*', async (route) => {
    console.log('[E2E STUB] rpc get_shared_note matched for', route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { note_content: '# Hello public', note_title: 'Public Note Title', is_encrypted: false }
      ]),
    });
  });

  await page.goto('/share/token123');

  // Debug: dump body text for visibility
  const bodyText = await page.textContent('body');
  console.log('[E2E BODY]', bodyText?.substring(0, 1000));

  await expect(page.locator('text=Public Note Title')).toBeVisible();
  await expect(page.locator('text=Hello public')).toBeVisible();
});
