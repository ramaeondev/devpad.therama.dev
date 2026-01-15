import { test, expect } from '@playwright/test';
import { PublicNotePO } from '../page-objects/public-note.po';
import { stubRpcEndpoints, stubAnalytics } from '../helpers/route-stubs';

test('public shared note loads and displays content', async ({ page }) => {
  // Log requests and errors for debugging
  page.on('request', (req) => {
    console.log('[E2E REQ]', req.method(), req.url());
  });
  page.on('console', (msg) => console.log('[PAGE LOG]', msg.text()));
  page.on('pageerror', (err) => console.log('[PAGE ERROR]', err.message));

  // Ensure RPCs/analytics are stubbed early
  await stubRpcEndpoints(page);
  await stubAnalytics(page);

  // Stub public_shares query
  await page.route('**/rest/v1/public_shares*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'share-1',
          user_id: 'u1',
          note_id: 'note-1',
          share_token: 'token123',
          permission: 'readonly',
          view_count: 1,
          unique_view_count: 1,
          note_title: 'Public Note Title'
        }
      ]),
    });
  });

  // Stub RPC get_shared_note
  await page.route('**/rpc/get_shared_note*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { note_content: '# Hello public', note_title: 'Public Note Title', is_encrypted: false }
      ]),
    });
  });

  const publicNote = new PublicNotePO(page);

  // Wait for rpc to return as part of navigation
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/rpc/get_shared_note') && r.status() === 200, { timeout: 10000 }),
    publicNote.goto('token123'),
  ]);

  await expect(publicNote.title()).toBeVisible({ timeout: 10000 });
  await expect(publicNote.title()).toHaveText('Public Note Title', { timeout: 10000 });
  await expect(publicNote.content()).toContainText('Hello public', { timeout: 10000 });
});
