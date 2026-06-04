import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class ClientHomePage extends BasePage {
  constructor(page: Page) { super(page); }

  async goto() {
    await this.navigateTo('/client');
    await this.waitForSpinnerGone();
  }

  async clickNewRequest() {
    await this.page.getByRole('button', { name: /novo pedido|solicitar serviço/i }).first().click();
  }

  async clickOrders() {
    // Bottom nav tem link "Pedidos" → /client/orders
    await this.page.getByRole('link', { name: /^pedidos$/i }).first().click();
  }

  async clickSupport() {
    // Suporte acessível via /client/support diretamente
    await this.navigateTo('/client/support');
  }

  async expectWelcomeVisible() {
    await expect(this.page.getByText(/olá|bem-vindo|oi,/i).first()).toBeVisible({ timeout: 10_000 });
  }

  async searchService(query: string) {
    const input = this.page.getByPlaceholder(/buscar|o que você precisa/i).first();
    await input.fill(query);
  }
}
