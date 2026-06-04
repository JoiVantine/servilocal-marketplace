import { Page, expect } from '@playwright/test';

export class BasePage {
  constructor(protected page: Page) {}

  async waitForPageReady() {
    await this.page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  }

  async waitForSpinnerGone() {
    const spinner = this.page.locator('.animate-spin').first();
    if (await spinner.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await spinner.waitFor({ state: 'hidden', timeout: 15_000 });
    }
  }

  async expectToastOrText(text: string | RegExp) {
    await expect(this.page.getByText(text).first()).toBeVisible({ timeout: 8_000 });
  }

  async navigateTo(path: string) {
    await this.page.goto(path);
    await this.waitForSpinnerGone();
  }
}
