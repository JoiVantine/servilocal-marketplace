import { defineConfig, devices } from '@playwright/test';

// Backend de teste roda em porta separada para não conflitar com a Evolution API (3001)
const TEST_API_PORT = process.env.TEST_API_PORT || '3002';
const API_URL = `http://localhost:${TEST_API_PORT}`;
const BASE_URL = process.env.BASE_URL || 'http://localhost:5174';

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    // Redireciona chamadas de API da porta padrão (3001) para o backend de teste (3002)
    // Necessário porque o Vite pode servir o bundle com VITE_API_URL=3001 em cache
    serviceWorkers: 'block',
  },

  projects: [
    { name: 'setup', testMatch: '**/global-setup.ts' },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],

  webServer: [
    {
      command: `npm run test`,
      cwd: 'servilocal-api',
      url: `${API_URL}/api/health`,
      reuseExistingServer: true,
      timeout: 60_000,
      env: { NODE_ENV: 'test', PORT: TEST_API_PORT },
    },
    {
      command: `vite --port 5174 --mode test`,
      url: BASE_URL,
      reuseExistingServer: true,
      timeout: 30_000,
      env: { VITE_API_URL: `http://localhost:${TEST_API_PORT}` },
    },
  ],
});
