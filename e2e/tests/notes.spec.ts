import { test, expect } from '@playwright/test';
import { stubNotesWithList, stubAuthSession } from '../helpers/route-stubs';

const notesFixture = [
  {
    id: 'note-1',
    title: 'E2E Test Note',
    content: '# Hello from E2E',
    user_id: 'u1',
    created_at: '2026-01-01T00:00:00.000Z',
  },
];

test.skip('notes list shows My Notes and items from API', async ({ page }) => {
  await stubAuthSession(page);
  await stubNotesWithList(page, notesFixture as any);

  // First ensure dashboard is accessible (session honored), then navigate to notes
  await page.goto('/dashboard');
  await expect(page.locator('text=Welcome to DevPad')).toBeVisible({ timeout: 10000 });

  await page.goto('/notes');
  await expect(page.locator('text=My Notes')).toBeVisible();
  await expect(page.locator('text=E2E Test Note')).toBeVisible();
});
