import { test as base, expect } from '@playwright/test';
import { API_URL } from './constants';

const TEST_PORT = API_URL.split(':')[2]; // '3002'

// Sobrescreve window.fetch antes do app carregar para redirecionar
// todas as chamadas de localhost:3001 para o backend de teste (localhost:3002).
// Necessário porque o VITE_API_URL baked no bundle pode apontar para 3001.
export const test = base.extend<Record<string, never>>({
  page: async ({ page }, use) => {
    await page.addInitScript((port: string) => {
      const _fetch = window.fetch.bind(window);
      window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
        let url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
        if (url.includes('localhost:3001')) {
          const redirected = url.replace(/localhost:3001/g, `localhost:${port}`);
          const newInput = typeof input === 'string' ? redirected
            : input instanceof URL ? new URL(redirected)
            : new Request(redirected, input as Request);
          return _fetch(newInput, init);
        }
        return _fetch(input, init);
      };
    }, TEST_PORT);
    await use(page);
  },
});

export { expect };
