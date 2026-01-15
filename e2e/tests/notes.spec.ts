import { test, expect } from '@playwright/test';
import { stubNotesWithList, stubAuthSession, stubRpcEndpoints, stubAnalytics, stubRestFallback, stubFoldersWithList } from '../helpers/route-stubs';
import { NotesPO } from '../page-objects/notes.po';
import { DashboardPO } from '../page-objects/dashboard.po';

const notesFixture = [
  {
    id: 'note-1',
    title: 'E2E Test Note',
    content: '# Hello from E2E',
    user_id: 'u1',
    created_at: '2026-01-01T00:00:00.000Z',
  },
];

test('notes list shows My Notes and items from API', async ({ page }) => {
  await stubRpcEndpoints(page);
  await stubAnalytics(page);
  await stubRestFallback(page);

  // Log requests and errors for debugging and diagnosis of matching failures
  page.on('request', (req) => console.log('[E2E REQ]', req.method(), req.url()));
  page.on('pageerror', (err) => console.log('[PAGE ERROR]', err.message));
  page.on('console', (msg) => console.log('[PAGE LOG]', msg.text()));

  await stubAuthSession(page);
  await stubFoldersWithList(page, [
    {
      id: 'folder-root',
      title: 'My Notes',
      user_id: 'u1',
      is_root: true,
      notes: [
        {
          id: 'note-1',
          title: 'E2E Test Note',
          user_id: 'u1',
          created_at: '2026-01-01T00:00:00.000Z',
        },
      ],
    },
  ]);
  await stubNotesWithList(page, notesFixture as any);

  const notes = new NotesPO(page);
  const dash = new DashboardPO(page);

  // Open dashboard so the sidebar (folder tree) is visible
  await dash.goto();
  await page.waitForURL('**/dashboard**', { timeout: 10000 });

  // Wait for the folder tree to render and show our root folder
  await expect(page.locator('[data-folder-id="folder-root"]')).toBeVisible({ timeout: 15000 });

  // Debug: dump content to help identify why the note isn't rendering
  // (will be removed once we stabilize the test)
  // eslint-disable-next-line no-console
  console.log(await page.content());

  // Now expect the note row in the folder tree
  await expect(notes.noteByTitle('E2E Test Note')).toBeVisible({ timeout: 15000 });
});
