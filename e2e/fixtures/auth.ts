import { test as base } from '@playwright/test';
import { AUTH_FILES } from './constants';

type Role = 'client' | 'provider' | 'admin';

// Fixture que permite fazer `test.use({ storageState: authAs('client') })` no topo de um spec
export function authAs(role: Role) {
  return AUTH_FILES[role];
}

// Fixture estendida com helpers de navegação pós-login
export const test = base.extend<{ role: Role }>({
  role: ['client', { option: true }],
});

export { expect } from '@playwright/test';
