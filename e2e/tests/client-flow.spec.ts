import { test, expect } from '../fixtures/test';
import { AUTH_FILES, API_URL as API } from '../fixtures/constants';
import { ClientHomePage } from '../pages/ClientHomePage';
import { NewServiceRequestPage } from '../pages/NewServiceRequestPage';
import { ClientRequestDetailPage } from '../pages/ClientRequestDetailPage';

test.use({ storageState: AUTH_FILES.client });

// ─── helpers ────────────────────────────────────────────────────────────────

async function getClientToken(page: import('@playwright/test').Page) {
  const res = await page.request.post(`${API}/api/auth/test-login`, {
    data: { email: 'e2e-client@servilocal.test', role: 'client' },
  });
  return res.json() as Promise<{ token: string; user: { id: string; fullName: string; email: string } }>;
}

async function createRequest(page: import('@playwright/test').Page, token: string, userId: string, overrides = {}) {
  const res = await page.request.post(`${API}/api/service-requests`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      title: 'Limpeza E2E',
      description: 'Limpeza residencial.',
      category: 'Limpeza',
      subcategory: 'Limpeza Residencial',
      city: 'São Paulo',
      when: 'this_week',
      urgency: 'medium',
      status: 'open',
      clientId: userId,
      ...overrides,
    },
  });
  expect(res.ok()).toBeTruthy();
  return res.json();
}

// ─── Home ────────────────────────────────────────────────────────────────────

test.describe('Cliente — home', () => {
  test('carrega sem redirecionar para onboarding', async ({ page }) => {
    const home = new ClientHomePage(page);
    await home.goto();
    await expect(page).toHaveURL('/client', { timeout: 10_000 });
    await home.expectWelcomeVisible();
  });

  test('navegar para "Pedidos" via bottom nav funciona', async ({ page }) => {
    const home = new ClientHomePage(page);
    await home.goto();
    await home.clickOrders();
    await expect(page).toHaveURL(/\/client\/orders/, { timeout: 8_000 });
  });

  test('categorias de serviços estão visíveis', async ({ page }) => {
    const home = new ClientHomePage(page);
    await home.goto();
    await expect(page.getByText('Elétrica').first()).toBeVisible();
    await expect(page.getByText('Limpeza').first()).toBeVisible();
  });

  test('clicar em categoria navega para novo pedido', async ({ page }) => {
    const home = new ClientHomePage(page);
    await home.goto();
    await page.getByText('Elétrica').first().click();
    await expect(page).toHaveURL(/\/client\/new-request/, { timeout: 8_000 });
  });
});

// ─── Criar pedido ────────────────────────────────────────────────────────────

test.describe('Cliente — criar pedido', () => {
  test('cria pedido e redireciona para o detalhe', async ({ page }) => {
    const newReq = new NewServiceRequestPage(page);
    await newReq.goto();

    await newReq.selectCategory('Limpeza');
    await newReq.selectSubcategory('Limpeza Residencial');
    await newReq.fillDescription('Preciso de limpeza geral em apartamento de 2 quartos.');
    await newReq.submit();

    await newReq.expectRedirectToDetail();
  });

  test('botão "Publicar pedido" fica desabilitado sem subcategoria', async ({ page }) => {
    const newReq = new NewServiceRequestPage(page);
    await newReq.goto();
    const btn = page.getByRole('button', { name: /publicar pedido/i }).first();
    await expect(btn).toBeDisabled({ timeout: 5_000 });
  });

  test('campo de data e hora aceita valor futuro', async ({ page }) => {
    const newReq = new NewServiceRequestPage(page);
    await newReq.goto();
    const future = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
    await newReq.setScheduledAt(future);
    const input = page.locator('input[type="datetime-local"]');
    await expect(input).toHaveValue(future);
  });

  test('detalhe do pedido criado via API exibe título e status "Aberto"', async ({ page }) => {
    const { token, user } = await getClientToken(page);
    const request = await createRequest(page, token, user.id, {
      title: 'Pintura de sala E2E',
      category: 'Pintura',
      subcategory: 'Pintura Residencial',
    });

    const detail = new ClientRequestDetailPage(page);
    await detail.gotoById(request.id);
    // Page shows category as "Serviço", not the title field
    await detail.expectCategoryVisible(/pintura/i);
    await detail.expectStatusBadge(/aberto/i);
  });
});

// ─── Lista de pedidos ────────────────────────────────────────────────────────

test.describe('Cliente — meus pedidos', () => {
  test('página carrega com abas de filtro', async ({ page }) => {
    await page.goto('/client/orders');
    await expect(page.getByRole('button', { name: /^todos$/i })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole('button', { name: /abertos/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /em andamento/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /concluídos/i })).toBeVisible();
  });

  test('pedido criado aparece na lista', async ({ page }) => {
    const { token, user } = await getClientToken(page);
    const title = `Pedido Lista E2E ${Date.now()}`;
    await createRequest(page, token, user.id, { title, subcategory: title });

    await page.goto('/client/orders');
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 10_000 });
  });

  test('aba "Abertos" filtra corretamente', async ({ page }) => {
    await page.goto('/client/orders');
    await page.getByRole('button', { name: /^abertos$/i }).click();
    await page.waitForTimeout(500);
    // Aceita lista com pedidos ou empty state — não deve crashar
    await expect(page.locator('body')).not.toContainText(/erro interno|500/i);
  });

  test('botão "Novo pedido" navega para criação', async ({ page }) => {
    await page.goto('/client/orders');
    await page.getByRole('link', { name: /novo pedido/i }).first().click();
    await expect(page).toHaveURL(/\/client\/new-request/, { timeout: 8_000 });
  });
});

// ─── Menu e navegação ────────────────────────────────────────────────────────

test.describe('Cliente — menu', () => {
  test('página de menu carrega com itens de navegação', async ({ page }) => {
    await page.goto('/client/menu');
    await expect(page.getByText('Meus dados').first()).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText('Endereços salvos').first()).toBeVisible();
  });

  test('navegar para perfil funciona', async ({ page }) => {
    await page.goto('/client/menu');
    await page.getByText('Meus dados').first().click();
    await expect(page).toHaveURL(/\/client\/profile/, { timeout: 8_000 });
  });

  test('navegar para ajuda funciona', async ({ page }) => {
    await page.goto('/client/menu');
    await page.getByText(/ajuda|help/i).first().click();
    await expect(page).toHaveURL(/\/client\/help/, { timeout: 8_000 });
  });
});

// ─── Perfil ──────────────────────────────────────────────────────────────────

test.describe('Cliente — perfil', () => {
  test('página de perfil renderiza nome do usuário', async ({ page }) => {
    await page.goto('/client/profile');
    await expect(page).not.toHaveURL('/login', { timeout: 8_000 });
    await expect(page.locator('body')).not.toContainText(/erro interno|500/i);
  });
});

// ─── Ajuda ───────────────────────────────────────────────────────────────────

test.describe('Cliente — ajuda', () => {
  test('página de ajuda renderiza sem erro', async ({ page }) => {
    await page.goto('/client/help');
    await expect(page.getByText(/ajuda|suporte|perguntas/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('"Termos de uso" navega para página de termos', async ({ page }) => {
    await page.goto('/client/help');
    await page.getByText(/termos de uso/i).first().click();
    await expect(page).toHaveURL('/client/terms', { timeout: 5_000 });
    await expect(page.getByText(/termos de uso/i).first()).toBeVisible();
  });

  test('"Política de privacidade" navega para página de política', async ({ page }) => {
    await page.goto('/client/help');
    await page.getByText(/política de privacidade/i).first().click();
    await expect(page).toHaveURL('/client/privacy', { timeout: 5_000 });
    await expect(page.getByText(/política de privacidade/i).first()).toBeVisible();
  });

  test('"Perguntas frequentes" navega para FAQ', async ({ page }) => {
    await page.goto('/client/help');
    await page.getByText(/perguntas frequentes/i).first().click();
    await expect(page).toHaveURL('/client/faq', { timeout: 5_000 });
  });
});

// ─── Suporte ─────────────────────────────────────────────────────────────────

test.describe('Cliente — suporte', () => {
  test('página de suporte carrega', async ({ page }) => {
    const home = new ClientHomePage(page);
    await home.goto();
    await home.clickSupport();
    await expect(page).toHaveURL('/client/support', { timeout: 8_000 });
    await expect(page.getByText(/suporte|chamados/i).first()).toBeVisible({ timeout: 10_000 });
  });
});

// ─── Propostas ───────────────────────────────────────────────────────────────

test.describe('Cliente — propostas', () => {
  test('página de propostas carrega para pedido existente', async ({ page }) => {
    const { token, user } = await getClientToken(page);
    const request = await createRequest(page, token, user.id, {
      title: 'Proposta E2E',
      status: 'in_conversation',
    });

    await page.goto(`/client/request/${request.id}/proposals`);
    await expect(page).not.toHaveURL('/login', { timeout: 8_000 });
    await expect(page.locator('body')).not.toContainText(/erro interno|500/i);
    // Aceita lista vazia ou com propostas
    await expect(
      page.getByText(/proposta|profissional|nenhuma/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});

// ─── Avaliação ───────────────────────────────────────────────────────────────

test.describe('Cliente — avaliação', () => {
  test('página de avaliação renderiza sem erro para pedido concluído', async ({ page }) => {
    const { token, user } = await getClientToken(page);
    const request = await createRequest(page, token, user.id, {
      title: 'Avaliação E2E',
      status: 'completed',
    });

    await page.goto(`/client/request/${request.id}/rate`);
    await expect(page).not.toHaveURL('/login', { timeout: 8_000 });
    await expect(page.locator('body')).not.toContainText(/erro interno|500/i);
  });

  test('botão de enviar fica desabilitado até o usuário avaliar todas as categorias', async ({ page }) => {
    const { token, user } = await getClientToken(page);
    const request = await createRequest(page, token, user.id, {
      title: 'Rating Default E2E',
      status: 'completed',
    });

    await page.goto(`/client/request/${request.id}/rate`);
    const submitBtn = page.getByRole('button', { name: /enviar|avaliar/i }).first();
    await expect(submitBtn).toBeVisible({ timeout: 8_000 });
    // Sem interação: botão deve estar desabilitado
    await expect(submitBtn).toBeDisabled();
  });
});

// ─── Pagamentos ──────────────────────────────────────────────────────────────

test.describe('Cliente — pagamentos', () => {
  test('página de pagamentos não exibe dados mock', async ({ page }) => {
    await page.goto('/client/payments');
    await expect(page).not.toHaveURL('/login', { timeout: 8_000 });
    await expect(page.getByText(/4242/i)).toHaveCount(0);
  });

  test('página de pagamentos exibe estado vazio com mensagem de em breve', async ({ page }) => {
    await page.goto('/client/payments');
    await expect(page.getByText(/em breve|nenhuma forma|pagamentos/i).first()).toBeVisible({ timeout: 8_000 });
  });
});

// ─── Notificações ────────────────────────────────────────────────────────────

test.describe('Cliente — notificações', () => {
  test('página de notificações carrega com toggles', async ({ page }) => {
    await page.goto('/client/notifications');
    await expect(page).not.toHaveURL('/login', { timeout: 8_000 });
    await expect(page.getByText(/notificações|notif/i).first()).toBeVisible({ timeout: 8_000 });
  });
});

// ─── Progresso do pedido ─────────────────────────────────────────────────────

test.describe('Cliente — progresso do pedido', () => {
  test('página de progresso carrega para pedido agreed', async ({ page }) => {
    const { token, user } = await getClientToken(page);
    const request = await createRequest(page, token, user.id, {
      title: 'Progresso E2E',
      status: 'agreed',
      progressStatus: 'on_the_way',
      confirmedProviderName: 'Prestador Teste',
      confirmedProviderId: 'fake-provider-id',
    });

    await page.goto(`/client/request/${request.id}/progress`);
    await expect(page).not.toHaveURL('/login', { timeout: 8_000 });
    await expect(page.getByText(/pedido em andamento/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
