const PROD_API_URL = 'https://servilocal-api-production.up.railway.app';
const envApiUrl = import.meta.env.VITE_API_URL;
const isProductionHost = window.location.hostname === 'www.appservilocal.com';
const isLocalApiUrl = !envApiUrl || envApiUrl.includes('localhost') || envApiUrl.includes('127.0.0.1');
export const API_URL = isProductionHost && isLocalApiUrl
  ? PROD_API_URL
  : (envApiUrl || 'http://localhost:3001');

async function request(method, path, data) {
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
  me: () => request('GET', '/api/auth/me'),

  loginViaEmailPassword: async (identifier, password, role) => {
    const data = await request('POST', '/api/auth/login', { identifier, password, role });
    if (data.token) localStorage.setItem('token', data.token);
    return data;
  },

  logout: async (redirectUrl = '/') => {
    await request('POST', '/api/auth/logout').catch(() => {});
    localStorage.removeItem('token');
    window.location.href = redirectUrl;
  },

  register: async (data) => {
    const res = await request('POST', '/api/auth/register', data);
    if (res.token) localStorage.setItem('token', res.token);
    return res;
  },

  sendOtp: (data) => request('POST', '/api/auth/send-otp', data),

  verifyOtp: async (data) => {
    const res = await request('POST', '/api/auth/verify-otp', data);
    if (res.token) localStorage.setItem('token', res.token);
    return res;
  },

  resendOtp: (email) => request('POST', '/api/auth/resend-otp', { email }),

  setToken: (token) => localStorage.setItem('token', token),

  updateMe: (data) => request('PATCH', '/api/auth/me', data),

  setPassword: (password) => request('PATCH', '/api/auth/me/password', { password }),

  checkProfile: (email, role) => request('POST', '/api/auth/check-profile', { email, role }),

  resetPasswordRequest: (email) =>
    request('POST', '/api/auth/reset-password-request', { email }),

  resetPassword: (data) => request('POST', '/api/auth/reset-password', data),

  loginWithProvider: () => {
    console.warn('[auth] loginWithProvider não implementado ainda');
  },
};

const progress = {
  notify: (requestId, data) => request('POST', `/api/service-requests/${requestId}/progress`, data),
  verifyCompletion: (requestId, code) => request('POST', `/api/service-requests/${requestId}/verify-completion`, { code }),
  notifyMessage: (conversationId, preview) => request('POST', `/api/conversations/${conversationId}/notify-message`, { preview }).catch(() => {}),
  confirmProvider: (requestId, data) => request('POST', `/api/service-requests/${requestId}/confirm-provider`, data),
  submitEdit: (requestId, data) => request('POST', `/api/service-requests/${requestId}/submit-edit`, data),
};

const support = {
  list: (query = {}) => {
    const params = new URLSearchParams(
      Object.fromEntries(
        Object.entries(query)
          .filter(([, value]) => value != null && value !== '')
          .map(([key, value]) => [key, String(value)])
      )
    );
    const qs = params.toString();
    return request('GET', `/api/support-tickets${qs ? `?${qs}` : ''}`);
  },

  get: (id) => request('GET', `/api/support-tickets/${id}`),

  create: (data) => request('POST', '/api/support-tickets', data),

  listEvents: (id) => request('GET', `/api/support-tickets/${id}/events`),

  reply: (id, data) => request('POST', `/api/support-tickets/${id}/replies`, data),

  update: (id, data) => request('PATCH', `/api/support-tickets/${id}`, data),
};

const push = {
  config: () => request('GET', '/api/push/config'),
  saveSubscription: (subscription) => request('POST', '/api/push/subscriptions', subscription),
  removeSubscription: (endpoint) => request('DELETE', '/api/push/subscriptions', { endpoint }),
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
      return request('GET', `${path}${qs ? `?${qs}` : ''}`);
    },

    list: (sort, limit) => {
      const params = new URLSearchParams();
      if (sort) params.set('_sort', sort);
      if (limit) params.set('_limit', String(limit));
      const qs = params.toString();
      return request('GET', `${path}${qs ? `?${qs}` : ''}`);
    },

    get: (id) => request('GET', `${path}/${id}`),
    create: (data) => request('POST', path, data),
    update: (id, data) => request('PATCH', `${path}/${id}`, data),
    delete: (id) => request('DELETE', `${path}/${id}`),

    subscribe: () => ({ unsubscribe: () => {} }),
  };
}

export const api = {
  auth,
  support,
  progress,
  push,

  uploadFile: async (file) => {
    const token = localStorage.getItem('token');
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_URL}/api/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || res.statusText);
    }
    const { url } = await res.json();
    return url;
  },

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
    Service: createEntity('/api/services'),
  },

  admin: {
    stats: (city) => request('GET', `/api/admin/stats${city ? `?city=${encodeURIComponent(city)}` : ''}`),
    atRisk: () => request('GET', '/api/admin/at-risk-requests'),
  },

  functions: {
    invoke: async (name, params) => {
      if (name === 'maps') {
        const data = await request('POST', '/api/maps', params);
        return { data };
      }
      if (name === 'deleteUserCascade')
        return request('DELETE', `/api/admin/users/${params.userId}`);
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
