import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class ProviderHomePage extends BasePage {
  constructor(page: Page) { super(page); }

  async goto() {
    await this.navigateTo('/provider');
    await this.waitForSpinnerGone();
  }

  async clickConversations() {
    // Conversas removidas do home; navega diretamente
    await this.navigateTo('/provider/conversations');
  }

  async clickMap() {
    await this.navigateTo('/provider/map');
  }

  async clickSupport() {
    await this.page.getByRole('link', { name: /ajuda e suporte/i }).first().click();
  }

  async clickTab(tab: 'available' | 'active' | 'agenda' | 'history') {
    const labels = { available: 'Disponíveis', active: 'Em andamento', agenda: 'Agenda', history: 'Histórico' };
    await this.page.getByRole('button', { name: labels[tab] }).first().click();
  }

  async expectDashboardVisible() {
    await expect(
      this.page.getByText(/recebendo pedidos/i).first()
    ).toBeVisible({ timeout: 10_000 });
  }
}
