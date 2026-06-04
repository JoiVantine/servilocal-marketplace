import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class AdminSupportDeskPage extends BasePage {
  constructor(page: Page) { super(page); }

  async goto() {
    await this.navigateTo('/admin/support');
    await this.waitForSpinnerGone();
  }

  async expectDeskVisible() {
    await expect(
      this.page.getByText(/central de suporte|tickets|chamados/i).first()
    ).toBeVisible({ timeout: 10_000 });
  }

  async clickTicketBySubject(subject: string | RegExp) {
    await this.page.getByText(subject).first().click();
  }

  async assignToSelf() {
    await this.page.getByRole('button', { name: /atribuir a mim|assumir/i }).first().click();
  }

  async changeStatus(status: string) {
    const statusBtn = this.page.getByRole('button', { name: new RegExp(status, 'i') }).first();
    await statusBtn.click();
  }

  async replyAsAdmin(text: string) {
    const textarea = this.page.getByPlaceholder(/resposta|mensagem/i).first();
    await textarea.fill(text);
    await this.page.getByRole('button', { name: /enviar resposta|responder|enviar/i }).last().click();
  }

  async filterByStatus(status: string) {
    await this.page.getByRole('button', { name: new RegExp(status, 'i') }).first().click();
  }

  async expectTicketCount(minCount: number) {
    const rows = this.page.locator('[data-testid="ticket-row"], tr, .ticket-card').first();
    await expect(rows).toBeVisible({ timeout: 10_000 });
    const count = await this.page.locator('[data-testid="ticket-row"], tr, .ticket-card').count();
    expect(count).toBeGreaterThanOrEqual(minCount);
  }
}
