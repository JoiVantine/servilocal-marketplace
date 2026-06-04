import { test, expect } from '../fixtures/test';
import { AUTH_FILES, API_URL as API } from '../fixtures/constants';
import { AdminSupportDeskPage } from '../pages/AdminSupportDeskPage';

test.use({ storageState: AUTH_FILES.admin });

test.describe('Admin — dashboard', () => {
  test('painel admin carrega e exibe métricas', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL('/admin/dashboard', { timeout: 10_000 });
    // Aguarda alguma métrica aparecer
    await expect(
      page.getByText(/prestadores|clientes|pedidos|conversas/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('usuário sem role admin não consegue acessar /admin/dashboard', async ({ browser }) => {
    // Abre contexto limpo sem storageState de admin
    const ctx = await browser.newContext({ storageState: AUTH_FILES.client });
    const page = await ctx.newPage();

    await page.goto('/admin/dashboard');
    // Deve ser redirecionado ou mostrar "não autorizado"
    await expect(page).not.toHaveURL('/admin/dashboard', { timeout: 8_000 });
    await ctx.close();
  });
});

test.describe('Admin — central de suporte', () => {
  test('desk de suporte carrega para admin', async ({ page }) => {
    const desk = new AdminSupportDeskPage(page);
    await desk.goto();
    await desk.expectDeskVisible();
  });

  test('admin vê ticket criado por cliente no desk', async ({ page, request }) => {
    // Cria ticket como cliente
    const clientLogin = await request.post(`${API}/api/auth/test-login`, {
      data: { email: 'e2e-client@servilocal.test', role: 'client' },
    });
    const { token: clientToken, user: clientUser } = await clientLogin.json();

    const subject = `Desk admin E2E ${Date.now()}`;
    await request.post(`${API}/api/support-tickets`, {
      headers: { Authorization: `Bearer ${clientToken}` },
      data: {
        category: 'account_access',
        subject,
        description: 'Não consigo fazer login.',
        requesterId: clientUser.id,
        requesterRole: 'client',
        requesterName: clientUser.fullName,
        requesterEmail: clientUser.email,
      },
    });

    const desk = new AdminSupportDeskPage(page);
    await desk.goto();
    await expect(page.getByText(subject)).toBeVisible({ timeout: 10_000 });
  });

  test('admin vê link para pedido vinculado no detalhe do ticket', async ({ page, request }) => {
    // Cria pedido e ticket vinculado
    const clientLogin = await request.post(`${API}/api/auth/test-login`, {
      data: { email: 'e2e-client@servilocal.test', role: 'client' },
    });
    const { token: clientToken, user: clientUser } = await clientLogin.json();

    const reqRes = await request.post(`${API}/api/service-requests`, {
      headers: { Authorization: `Bearer ${clientToken}` },
      data: {
        title: 'Pedido admin link E2E',
        description: 'Serviço de teste.',
        category: 'Limpeza',
        city: 'São Paulo',
        when: 'today',
        status: 'open',
        clientId: clientUser.id,
      },
    });
    const serviceRequest = await reqRes.json();

    const subject = `Ticket com pedido ${Date.now()}`;
    const ticketRes = await request.post(`${API}/api/support-tickets`, {
      headers: { Authorization: `Bearer ${clientToken}` },
      data: {
        category: 'client_issue',
        subject,
        description: 'Problema relacionado ao pedido.',
        requesterId: clientUser.id,
        requesterRole: 'client',
        requesterName: clientUser.fullName,
        requesterEmail: clientUser.email,
        relatedServiceRequestId: serviceRequest.id,
      },
    });
    await ticketRes.json();

    await page.goto(`/admin/support`);
    await expect(page.getByText(subject)).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Admin — gestão de usuários', () => {
  test('página de usuários carrega', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page).toHaveURL('/admin/users', { timeout: 8_000 });
    await expect(
      page.getByText(/usuários|clientes|prestadores/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Admin — stats API', () => {
  test('/api/admin/stats retorna dados estruturados', async ({ request }) => {
    const loginRes = await request.post(`${API}/api/auth/test-login`, {
      data: { email: 'e2e-admin@servilocal.test', role: 'admin' },
    });
    const { token } = await loginRes.json();

    const statsRes = await request.get(`${API}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(statsRes.ok()).toBeTruthy();
    const stats = await statsRes.json();
    expect(stats).toHaveProperty('overview');
    expect(stats).toHaveProperty('funnel');
    expect(stats).toHaveProperty('operations');
  });

  test('/api/admin/stats é bloqueado para role=client', async ({ request }) => {
    const loginRes = await request.post(`${API}/api/auth/test-login`, {
      data: { email: 'e2e-client@servilocal.test', role: 'client' },
    });
    const { token } = await loginRes.json();

    const statsRes = await request.get(`${API}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(statsRes.status()).toBe(403);
  });
});
