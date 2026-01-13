import { test, expect } from '@playwright/test';
import { stubAuthSession } from '../helpers/route-stubs';
import { DashboardPO } from '../page-objects/dashboard.po';

test('dashboard accessible when session present and shows sign out', async ({ page }) => {
  await stubAuthSession(page);
  const dash = new DashboardPO(page);

  await dash.goto();
  // Wait for the URL and user menu to be present, then open profile dropdown to reveal the Sign out button
  await page.waitForURL('**/dashboard**', { timeout: 10000 });
  await expect(page.locator('[data-ats-id="user-menu-button"]')).toBeVisible({ timeout: 10000 });
  await dash.openUserMenu();
  await expect(dash.signOutLocator()).toBeVisible({ timeout: 10000 });
});
