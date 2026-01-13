import { test, expect } from '@playwright/test';
import { stubEmptyNotes } from '../helpers/route-stubs';

test('home loads and has correct title', async ({ page }) => {
  await stubEmptyNotes(page);

  await page.goto('/');
  await expect(page).toHaveTitle(/DevPad/);
});
