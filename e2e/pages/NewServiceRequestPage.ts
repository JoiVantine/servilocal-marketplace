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

  async fillAddress() {
    await this.page.getByLabel('Rua').fill('Rua E2E');
    await this.page.getByLabel('Número').fill('123');
    await this.page.getByLabel('Bairro').fill('Centro');
    await this.page.getByLabel('Cidade').fill('São Paulo');
    await this.page.getByLabel('UF').fill('SP');
  }

  async setScheduledAt(isoLocalString: string) {
    const [date, time] = isoLocalString.split('T');
    await this.page.locator('input[type="date"]').first().fill(date);
    await this.page.locator('input[type="time"]').nth(0).fill(time);
    await this.page.locator('input[type="time"]').nth(1).fill('23:00');
  }

  async submit() {
    await this.page.getByRole('button', { name: /publicar pedido/i }).first().click();
  }

  async expectRedirectToDetail() {
    await expect(this.page).toHaveURL(/\/client\/request\//, { timeout: 15_000 });
  }
}
