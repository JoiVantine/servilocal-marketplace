import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class ChatPagePOM extends BasePage {
  constructor(page: Page) { super(page); }

  async gotoConversation(conversationId: string) {
    await this.navigateTo(`/chat/${conversationId}`);
    await this.waitForSpinnerGone();
  }

  async sendMessage(text: string) {
    const input = this.page.getByPlaceholder(/mensagem|escreva|digite/i).first();
    await input.fill(text);
    await this.page.getByRole('button', { name: /enviar/i }).first().click();
  }

  async expectMessageVisible(text: string | RegExp) {
    await expect(this.page.getByText(text).first()).toBeVisible({ timeout: 10_000 });
  }

  async expectAccessDenied() {
    await expect(
      this.page.getByText(/acesso negado|não autorizado|sem permissão|not found|404/i).first()
    ).toBeVisible({ timeout: 10_000 });
  }

  async expectNotOnChatPage() {
    // After access denial the page navigates away or shows an error — either is acceptable
    const url = this.page.url();
    const hasError = await this.page
      .getByText(/acesso negado|não autorizado|sem permissão/i)
      .first()
      .isVisible()
      .catch(() => false);
    const redirected = !url.includes('/chat/');
    expect(hasError || redirected, 'Deveria ter sido bloqueado ou redirecionado').toBeTruthy();
  }
}
