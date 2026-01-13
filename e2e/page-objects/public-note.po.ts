import { Page, Locator } from '@playwright/test';

export class PublicNotePO {
  readonly page: Page;
  constructor(page: Page) {
    this.page = page;
  }

  async goto(token: string) {
    await this.page.goto(`/share/${token}`);
  }

  title(): Locator {
    return this.page.locator('[data-ats-id="public-note-title"]');
  }

  content(): Locator {
    return this.page.locator('[data-ats-id="public-note-content"]');
  }
}
