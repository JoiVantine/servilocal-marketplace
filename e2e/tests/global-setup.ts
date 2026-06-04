import { test as setup, expect } from '@playwright/test';
import { AUTH_FILES, TEST_USERS, API_URL as API } from '../fixtures/constants';

const BASE = process.env.BASE_URL || 'http://localhost:5174';

async function loginAs(
  role: 'client' | 'provider' | 'admin',
  page: import('@playwright/test').Page
) {
  const userConfig = TEST_USERS[role];

  const loginRes = await page.request.post(`${API}/api/auth/test-login`, { data: userConfig });
  expect(loginRes.ok(), `test-login falhou para role=${role}: ${await loginRes.text()}`).toBeTruthy();
  const { token, user } = await loginRes.json();

  const headers = { Authorization: `Bearer ${token}` };

  // Garante que o cliente tenha UserProfile com onboarding concluído
  if (role === 'client') {
    const existing = await page.request.get(`${API}/api/user-profiles?userId=${user.id}`, { headers });
    const profiles = existing.ok() ? await existing.json() : [];
    if (!profiles.length) {
      const createRes = await page.request.post(`${API}/api/user-profiles`, {
        headers,
        data: {
          userId: user.id,
          role: 'client',
          name: userConfig.fullName,
          city: 'São Paulo',
          firstAccess: false,
          onboardingCompleted: true,
        },
      });
      expect(createRes.ok(), `Falhou ao criar UserProfile (client): ${await createRes.text()}`).toBeTruthy();
    } else {
      await page.request.patch(`${API}/api/user-profiles/${profiles[0].id}`, {
        headers,
        data: { firstAccess: false, onboardingCompleted: true },
      });
    }
  }

  // Garante que o prestador tenha UserProfile + ProviderProfile
  if (role === 'provider') {
    const existingUp = await page.request.get(`${API}/api/user-profiles?userId=${user.id}`, { headers });
    const ups = existingUp.ok() ? await existingUp.json() : [];
    if (!ups.length) {
      const createRes = await page.request.post(`${API}/api/user-profiles`, {
        headers,
        data: {
          userId: user.id,
          role: 'provider',
          name: userConfig.fullName,
          city: 'São Paulo',
          firstAccess: false,
          onboardingCompleted: true,
        },
      });
      expect(createRes.ok(), `Falhou ao criar UserProfile (provider): ${await createRes.text()}`).toBeTruthy();
    } else {
      await page.request.patch(`${API}/api/user-profiles/${ups[0].id}`, {
        headers,
        data: { firstAccess: false, onboardingCompleted: true },
      });
    }

    const existingPp = await page.request.get(`${API}/api/provider-profiles?created_by_id=${user.id}`, { headers });
    const pps = existingPp.ok() ? await existingPp.json() : [];
    if (!pps.length) {
      const ppRes = await page.request.post(`${API}/api/provider-profiles`, {
        headers,
        data: {
          userId: user.id,
          name: userConfig.fullName,
          bio: 'Perfil de teste E2E',
          city: 'São Paulo',
          specialties: ['Pedreiro'],
          category: 'Construção e Reformas',
          active: true,
        },
      });
      expect(ppRes.ok(), `Falhou ao criar ProviderProfile: ${await ppRes.text()}`).toBeTruthy();
    }
  }

  // Injeta token no localStorage e salva o storageState por role
  await page.goto(BASE);
  await page.evaluate((t: string) => localStorage.setItem('token', t), token);
  await page.context().storageState({ path: AUTH_FILES[role] });
}

setup('autenticar cliente', async ({ page }) => {
  await loginAs('client', page);
});

setup('autenticar prestador', async ({ page }) => {
  await loginAs('provider', page);
});

setup('autenticar admin', async ({ page }) => {
  await loginAs('admin', page);
});
