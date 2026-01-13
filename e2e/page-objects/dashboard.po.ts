import { Page, Locator } from '@playwright/test';

export class DashboardPO {
  readonly page: Page;
  constructor(page: Page) {
    this.page = page;
  }

  async goto(forceAuth = true) {
    const url = forceAuth ? '/dashboard?e2eForceAuth=1' : '/dashboard';
    await this.page.goto(url);
  }

  async openUserMenu() {
    await this.page.click('[data-ats-id="user-menu-button"]');
  }

  signOutLocator(): Locator {
    return this.page.locator('text=Sign out');
  }
}
