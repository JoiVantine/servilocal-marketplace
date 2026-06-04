import { test, expect } from '../fixtures/test';
import { API_URL as API } from '../fixtures/constants';

test.describe('Auth — rota de bypass (NODE_ENV=test)', () => {
  test('retorna token válido para role=client', async ({ request }) => {
    const res = await request.post(`${API}/api/auth/test-login`, {
      data: { email: 'e2e-client@servilocal.test', role: 'client', fullName: 'E2E Cliente' },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.token).toBeTruthy();
    expect(body.user.role).toBe('client');
  });

  test('retorna token válido para role=provider', async ({ request }) => {
    const res = await request.post(`${API}/api/auth/test-login`, {
      data: { email: 'e2e-provider@servilocal.test', role: 'provider', fullName: 'E2E Prestador' },
    });
    expect(res.ok()).toBeTruthy();
    const { user } = await res.json();
    expect(user.role).toBe('provider');
  });

  test('retorna token com role=admin quando solicitado', async ({ request }) => {
    const res = await request.post(`${API}/api/auth/test-login`, {
      data: { email: 'e2e-admin@servilocal.test', role: 'admin', fullName: 'E2E Admin' },
    });
    expect(res.ok()).toBeTruthy();
    const { user } = await res.json();
    expect(user.role).toBe('admin');
  });

  test('/api/auth/me retorna o usuário autenticado com token válido', async ({ request }) => {
    const loginRes = await request.post(`${API}/api/auth/test-login`, {
      data: { email: 'e2e-client@servilocal.test', role: 'client' },
    });
    const { token } = await loginRes.json();

    const meRes = await request.get(`${API}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(meRes.ok()).toBeTruthy();
    const me = await meRes.json();
    expect(me.email).toBe('e2e-client@servilocal.test');
  });

  test('/api/auth/me rejeita requisição sem token', async ({ request }) => {
    const res = await request.get(`${API}/api/auth/me`);
    expect(res.status()).toBe(401);
  });
});

test.describe('Auth — UI de login', () => {
  test('página de login renderiza campos de e-mail e senha', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByPlaceholder(/voce@exemplo|e-mail ou celular/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^entrar$/i })).toBeVisible();
  });

  test('login com credenciais erradas exibe mensagem de erro', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder(/voce@exemplo|e-mail ou celular/i).first().fill('inexistente@servilocal.test');
    await page.locator('input[type="password"]').fill('senhaerrada');
    await page.getByRole('button', { name: /^entrar$/i }).click();
    await expect(
      page.getByText(/incorretos|inválido|credenciais/i).first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test('usuário autenticado como cliente é redirecionado para /client', async ({ page }) => {
    await page.context().addInitScript(() => {});
    // Usa storageState do cliente já salvo pelo global setup
    await page.goto('/client', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL('/login', { timeout: 10_000 });
  });
});

test.describe('Auth — proteção de rotas admin', () => {
  test('rota /admin/dashboard redireciona visitante não autenticado', async ({ page }) => {
    await page.goto('/admin/dashboard');
    // deve ir para login ou home, nunca mostrar o dashboard
    await expect(page).not.toHaveURL('/admin/dashboard', { timeout: 8_000 });
  });
});
