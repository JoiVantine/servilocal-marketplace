const PROD_API_URL = 'https://servilocal-api-production.up.railway.app';
const envApiUrl = import.meta.env.VITE_API_URL;
const isProductionHost = window.location.hostname === 'www.appservilocal.com';
const isLocalApiUrl = !envApiUrl || envApiUrl.includes('localhost') || envApiUrl.includes('127.0.0.1');
const API_URL = isProductionHost && isLocalApiUrl
  ? PROD_API_URL
  : (envApiUrl || 'http://localhost:3001');

async function api(method, path, data) {
  const token = localStorage.getItem('token');
  if (path === '/api/auth/me' && !token) {
    throw new Error('Not authenticated');
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('token');
    }
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

const auth = {
  me: () => api('GET', '/api/auth/me'),

  loginViaEmailPassword: async (email, password) => {
    const data = await api('POST', '/api/auth/login', { email, password });
    if (data.token) localStorage.setItem('token', data.token);
    return data;
  },

  logout: async (redirectUrl = '/') => {
    await api('POST', '/api/auth/logout').catch(() => {});
    localStorage.removeItem('token');
    window.location.href = redirectUrl;
  },

  register: async (data) => {
    const res = await api('POST', '/api/auth/register', data);
    if (res.token) localStorage.setItem('token', res.token);
    return res;
  },

  sendOtp: (data) => api('POST', '/api/auth/send-otp', data),

  verifyOtp: async (data) => {
    const res = await api('POST', '/api/auth/verify-otp', data);
    if (res.token) localStorage.setItem('token', res.token);
    return res;
  },

  resendOtp: (email) => api('POST', '/api/auth/resend-otp', { email }),

  setToken: (token) => localStorage.setItem('token', token),

  updateMe: (data) => api('PATCH', '/api/auth/me', data),

  resetPasswordRequest: (email) =>
    api('POST', '/api/auth/reset-password-request', { email }),

  resetPassword: (data) => api('POST', '/api/auth/reset-password', data),

  loginWithProvider: (provider, redirectUrl) => {
    console.warn('[auth] loginWithProvider não implementado ainda');
  },
};

function createEntity(path) {
  return {
    filter: (query = {}, sort, limit) => {
      const params = new URLSearchParams(
        Object.fromEntries(Object.entries(query).filter(([, v]) => v != null))
      );
      if (sort) params.set('_sort', sort);
      if (limit) params.set('_limit', String(limit));
      const qs = params.toString();
      return api('GET', `${path}${qs ? `?${qs}` : ''}`);
    },

    list: (sort, limit) => {
      const params = new URLSearchParams();
      if (sort) params.set('_sort', sort);
      if (limit) params.set('_limit', String(limit));
      const qs = params.toString();
      return api('GET', `${path}${qs ? `?${qs}` : ''}`);
    },

    get: (id) => api('GET', `${path}/${id}`),
    create: (data) => api('POST', path, data),
    update: (id, data) => api('PATCH', `${path}/${id}`, data),
    delete: (id) => api('DELETE', `${path}/${id}`),

    subscribe: () => ({ unsubscribe: () => {} }),
  };
}

export const base44 = {
  auth,

  entities: {
    User: createEntity('/api/users'),
    UserProfile: createEntity('/api/user-profiles'),
    ProviderProfile: createEntity('/api/provider-profiles'),
    ServiceRequest: createEntity('/api/service-requests'),
    ServiceRequestInterest: createEntity('/api/service-request-interests'),
    Conversation: createEntity('/api/conversations'),
    Message: createEntity('/api/messages'),
    ProviderService: createEntity('/api/provider-services'),
    ProviderReview: createEntity('/api/provider-reviews'),
    Notification: createEntity('/api/notifications'),
  },

  functions: {
    invoke: async (name, params) => {
      if (name === 'maps') {
        const data = await api('POST', '/api/maps', params);
        return { data };
      }
      if (name === 'deleteUserCascade')
        return api('DELETE', `/api/admin/users/${params.userId}`);
      throw new Error(`Função não implementada: ${name}`);
    },
  },

  integrations: {
    Core: {
      UploadFile: async () => {
        console.warn('[upload] UploadFile não implementado ainda');
        return { public_url: null };
      },
    },
  },
};
