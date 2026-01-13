import { test, expect } from '@playwright/test';
import { stubNotesWithList, stubAuthSession } from '../helpers/route-stubs';
import { NotesPO } from '../page-objects/notes.po';

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
  await stubAuthSession(page);
  await stubNotesWithList(page, notesFixture as any);

  const notes = new NotesPO(page);

  await notes.goto();
  await page.waitForURL('**/notes**', { timeout: 10000 });
  await expect(notes.title()).toBeVisible({ timeout: 10000 });
  await expect(notes.noteByTitle('E2E Test Note')).toBeVisible({ timeout: 10000 });
});
