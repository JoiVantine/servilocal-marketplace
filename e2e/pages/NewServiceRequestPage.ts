import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class NewServiceRequestPage extends BasePage {
  constructor(page: Page) { super(page); }

  async goto() {
    await this.navigateTo('/client/new-request');
    await this.waitForSpinnerGone();
  }

  async selectCategory(categoryName: string) {
    // Open the category dropdown
    await this.page.getByRole('button', { name: /selecione a categoria/i }).first().click();
    // Click the category row to expand subcategories
    await this.page.getByText(categoryName, { exact: true }).first().click();
  }

  async selectSubcategory(subcategoryName: string) {
    await this.page.getByText(subcategoryName, { exact: true }).first().click();
  }

  async fillDescription(text: string) {
    const textarea = this.page.getByPlaceholder(/descreva|detalhes|conte mais/i).first();
    await textarea.fill(text);
  }

  async setScheduledAt(isoLocalString: string) {
    const input = this.page.locator('input[type="datetime-local"]');
    await input.fill(isoLocalString);
  }

  async submit() {
    await this.page.getByRole('button', { name: /publicar pedido/i }).first().click();
  }

  async expectRedirectToDetail() {
    await expect(this.page).toHaveURL(/\/client\/request\//, { timeout: 15_000 });
  }
}
