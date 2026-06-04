import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class SupportTicketDetailPage extends BasePage {
  constructor(page: Page) { super(page); }

  async expectSubjectVisible(subject: string | RegExp) {
    await expect(this.page.getByText(subject).first()).toBeVisible({ timeout: 10_000 });
  }

  async expectStatusBadge(status: string | RegExp) {
    await expect(this.page.getByText(status).first()).toBeVisible({ timeout: 10_000 });
  }

  async replyAs(text: string) {
    const textarea = this.page.getByPlaceholder(/resposta|mensagem|adicionar comentário/i).first();
    await textarea.fill(text);
    await this.page.getByRole('button', { name: /enviar resposta|responder|enviar/i }).last().click();
  }

  async expectReplyVisible(text: string | RegExp) {
    await expect(this.page.getByText(text).first()).toBeVisible({ timeout: 10_000 });
  }
}
