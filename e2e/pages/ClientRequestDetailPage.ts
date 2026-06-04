import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class ClientRequestDetailPage extends BasePage {
  constructor(page: Page) { super(page); }

  async gotoById(id: string) {
    await this.navigateTo(`/client/request/${id}`);
    await this.waitForSpinnerGone();
  }

  async expectTitleVisible(title: string | RegExp) {
    // ClientRequestDetail shows category/service text, not raw title field
    await expect(this.page.getByText(title).first()).toBeVisible({ timeout: 10_000 });
  }

  async expectCategoryVisible(category: string | RegExp) {
    await expect(this.page.getByText(category).first()).toBeVisible({ timeout: 10_000 });
  }

  async expectStatusBadge(status: string | RegExp) {
    await expect(this.page.getByText(status).first()).toBeVisible({ timeout: 10_000 });
  }

  async expectProposalsSection() {
    await expect(
      this.page.getByText(/propostas|interessados|profissionais/i).first()
    ).toBeVisible({ timeout: 10_000 });
  }
}
