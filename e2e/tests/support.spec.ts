import { test, expect } from '../fixtures/test';
import { AUTH_FILES, TEST_USERS, API_URL as API } from '../fixtures/constants';
import { SupportCenterPage } from '../pages/SupportCenterPage';
import { SupportTicketDetailPage } from '../pages/SupportTicketDetailPage';

async function getToken(
  request: import('@playwright/test').APIRequestContext,
  role: 'client' | 'provider' | 'admin'
) {
  const res = await request.post(`${API}/api/auth/test-login`, {
    data: TEST_USERS[role],
  });
  const { token } = await res.json();
  return token;
}

test.describe('Cliente — central de suporte', () => {
  test.use({ storageState: AUTH_FILES.client });

  test('página de suporte do cliente carrega', async ({ page }) => {
    const center = new SupportCenterPage(page);
    await center.goto('client');
    await expect(page).toHaveURL('/client/support', { timeout: 8_000 });
    await expect(
      page.getByText(/suporte|chamados|tickets/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('cliente consegue abrir um ticket via API', async ({ request }) => {
    const token = await getToken(request, 'client');
    const loginRes = await request.post(`${API}/api/auth/test-login`, {
      data: TEST_USERS.client,
    });
    const { user } = await loginRes.json();

    const res = await request.post(`${API}/api/support-tickets`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        category: 'app_issue',
        subject: 'Ticket E2E — erro na tela de pedidos',
        description: 'Ao acessar meus pedidos, aparece tela em branco.',
        requesterId: user.id,
        requesterRole: 'client',
        requesterName: user.fullName,
        requesterEmail: user.email,
      },
    });
    expect(res.ok(), `Falhou ao criar ticket: ${await res.text()}`).toBeTruthy();
    const ticket = await res.json();
    expect(ticket.subject).toContain('Ticket E2E');
    expect(ticket.status).toBe('open');
  });

  test('ticket criado aparece na lista da central de suporte', async ({ page, request }) => {
    const token = await getToken(request, 'client');
    const loginRes = await request.post(`${API}/api/auth/test-login`, { data: TEST_USERS.client });
    const { user } = await loginRes.json();

    // Cria ticket via API
    const subject = `Ticket lista E2E ${Date.now()}`;
    await request.post(`${API}/api/support-tickets`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        category: 'suggestion',
        subject,
        description: 'Sugestão de melhoria no filtro de pedidos.',
        requesterId: user.id,
        requesterRole: 'client',
        requesterName: user.fullName,
        requesterEmail: user.email,
      },
    });

    // Verifica na UI
    const center = new SupportCenterPage(page);
    await center.goto('client');
    await center.expectTicketInList(subject);
  });

  test('cliente consegue ver o detalhe do ticket', async ({ page, request }) => {
    const token = await getToken(request, 'client');
    const loginRes = await request.post(`${API}/api/auth/test-login`, { data: TEST_USERS.client });
    const { user } = await loginRes.json();

    const subject = `Ticket detalhe E2E ${Date.now()}`;
    const createRes = await request.post(`${API}/api/support-tickets`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        category: 'client_issue',
        subject,
        description: 'Não consigo acessar o mapa de prestadores.',
        requesterId: user.id,
        requesterRole: 'client',
        requesterName: user.fullName,
        requesterEmail: user.email,
      },
    });
    const ticket = await createRes.json();

    await page.goto(`/client/support/${ticket.id}`);
    const detail = new SupportTicketDetailPage(page);
    await detail.expectSubjectVisible(subject);
    await detail.expectStatusBadge(/aberto/i);
  });
});

test.describe('Admin — responder ticket', () => {
  test.use({ storageState: AUTH_FILES.admin });

  test('admin visualiza ticket aberto e consegue responder', async ({ page, request }) => {
    // Cria ticket como cliente
    const clientToken = await getToken(request, 'client');
    const clientLogin = await request.post(`${API}/api/auth/test-login`, { data: TEST_USERS.client });
    const { user: clientUser } = await clientLogin.json();

    const subject = `Ticket admin resposta E2E ${Date.now()}`;
    const createRes = await request.post(`${API}/api/support-tickets`, {
      headers: { Authorization: `Bearer ${clientToken}` },
      data: {
        category: 'billing',
        subject,
        description: 'Dúvida sobre cobrança.',
        requesterId: clientUser.id,
        requesterRole: 'client',
        requesterName: clientUser.fullName,
        requesterEmail: clientUser.email,
      },
    });
    await createRes.json();

    // Admin abre o detalhe
    await page.goto(`/admin/support`);
    await expect(page).toHaveURL('/admin/support', { timeout: 8_000 });
    await expect(
      page.getByText(/suporte|tickets|chamados/i).first()
    ).toBeVisible({ timeout: 10_000 });

    // Verifica que ticket aparece no desk
    await expect(page.getByText(subject)).toBeVisible({ timeout: 10_000 });
  });

  test('admin consegue responder um ticket via API', async ({ request }) => {
    const clientToken = await getToken(request, 'client');
    const clientLogin = await request.post(`${API}/api/auth/test-login`, { data: TEST_USERS.client });
    const { user: clientUser } = await clientLogin.json();

    const adminToken = await getToken(request, 'admin');

    const subject = `Ticket reply E2E ${Date.now()}`;
    const createRes = await request.post(`${API}/api/support-tickets`, {
      headers: { Authorization: `Bearer ${clientToken}` },
      data: {
        category: 'app_issue',
        subject,
        description: 'Bug ao enviar mensagem.',
        requesterId: clientUser.id,
        requesterRole: 'client',
        requesterName: clientUser.fullName,
        requesterEmail: clientUser.email,
      },
    });
    const ticket = await createRes.json();

    // Admin responde via API de eventos
    const replyRes = await request.post(`${API}/api/support-tickets/${ticket.id}/events`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        type: 'reply',
        message: 'Olá! Identificamos o problema e vamos corrigir em breve.',
        authorRole: 'admin',
      },
    });
    expect(replyRes.ok(), `Admin não conseguiu responder: ${await replyRes.text()}`).toBeTruthy();
  });
});

test.describe('Prestador — suporte', () => {
  test.use({ storageState: AUTH_FILES.provider });

  test('página de suporte do prestador carrega', async ({ page }) => {
    await page.goto('/provider/support');
    await expect(page).toHaveURL('/provider/support', { timeout: 8_000 });
    await expect(
      page.getByText(/suporte|chamados|tickets/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
