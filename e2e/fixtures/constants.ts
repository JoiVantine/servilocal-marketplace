import path from 'path';

export const API_URL = `http://localhost:${process.env.TEST_API_PORT || '3002'}`;

export const AUTH_FILES = {
  client: path.join(process.cwd(), '.auth/client.json'),
  provider: path.join(process.cwd(), '.auth/provider.json'),
  admin: path.join(process.cwd(), '.auth/admin.json'),
};

export const TEST_USERS = {
  client: { email: 'e2e-client@servilocal.test', role: 'client', fullName: 'E2E Cliente' },
  provider: { email: 'e2e-provider@servilocal.test', role: 'provider', fullName: 'E2E Prestador' },
  admin: { email: 'e2e-admin@servilocal.test', role: 'admin', fullName: 'E2E Admin' },
};
