import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class SupportCenterPage extends BasePage {
  constructor(page: Page) { super(page); }

  async goto(audience: 'client' | 'provider' = 'client') {
    await this.navigateTo(`/${audience}/support`);
    await this.waitForSpinnerGone();
  }

  async clickOpenTicket() {
    await this.page.getByRole('button', { name: /abrir|novo|novo ticket|\+/i }).first().click();
  }

  async fillTicketForm(opts: {
    category: string;
    subject: string;
    description: string;
  }) {
    // Seleciona a categoria no select/combobox
    const categorySelect = this.page.getByRole('combobox').first();
    await categorySelect.selectOption({ label: opts.category }).catch(async () => {
      await categorySelect.click();
      await this.page.getByText(opts.category, { exact: false }).first().click();
    });

    await this.page.getByPlaceholder(/assunto|título/i).first().fill(opts.subject);
    await this.page.getByPlaceholder(/descreva|detalhe|descrição/i).first().fill(opts.description);
  }

  async submitTicket() {
    await this.page.getByRole('button', { name: /enviar|abrir ticket|criar/i }).last().click();
  }

  async expectTicketInList(subject: string | RegExp) {
    await expect(this.page.getByText(subject).first()).toBeVisible({ timeout: 10_000 });
  }

  async expectEmptyState() {
    await expect(
      this.page.getByText(/nenhum ticket|sem chamados|sem solicitações/i).first()
    ).toBeVisible({ timeout: 10_000 });
  }

  async clickTicket(subject: string | RegExp) {
    await this.page.getByText(subject).first().click();
    await expect(this.page).toHaveURL(/\/support\//, { timeout: 10_000 });
  }
}
