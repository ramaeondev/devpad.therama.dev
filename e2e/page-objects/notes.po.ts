import { Page, Locator } from '@playwright/test';

export class NotesPO {
  readonly page: Page;
  constructor(page: Page) {
    this.page = page;
  }

  async goto(forceAuth = true) {
    const url = forceAuth ? '/notes?e2eForceAuth=1' : '/notes';
    await this.page.goto(url);
  }

  title(): Locator {
    return this.page.locator('[data-ats-id="note-list-title"]');
  }

  noteByTitle(title: string): Locator {
    // Matches folder note entries created with data-ats-id 'folder-note-<id>' containing the title
    return this.page.locator('[data-ats-id^="folder-note-"]', { hasText: title });
  }
}
