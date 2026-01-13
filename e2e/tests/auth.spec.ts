import { test, expect } from '@playwright/test';
import { stubAuthSession } from '../helpers/route-stubs';

test.skip('dashboard accessible when session present and shows sign out', async ({ page }) => {
  await stubAuthSession(page);

  await page.goto('/dashboard');

  // Wait for dashboard home to be visible, then open profile dropdown to reveal the Sign out button
  await expect(page.locator('text=Welcome to DevPad')).toBeVisible({ timeout: 10000 });
  await page.click('#user-menu-button');
  const signOut = page.locator('text=Sign out');
  await expect(signOut).toBeVisible();
});
