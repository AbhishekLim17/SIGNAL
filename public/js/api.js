async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed: ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  // Auth
  signup: (email, password) => request('/auth/signup', { method: 'POST', body: JSON.stringify({ email, password }) }),
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),
  forgot: (email) => request('/auth/forgot', { method: 'POST', body: JSON.stringify({ email }) }),
  reset: (token, password) => request('/auth/reset', { method: 'POST', body: JSON.stringify({ token, password }) }),

  // Email accounts
  listAccounts: () => request('/accounts'),
  testAccount: (fields) => request('/accounts/test', { method: 'POST', body: JSON.stringify(fields) }),
  createAccount: (fields) => request('/accounts', { method: 'POST', body: JSON.stringify(fields) }),
  deleteAccount: (id) => request(`/accounts/${id}`, { method: 'DELETE' }),

  // Admin
  adminListUsers: () => request('/admin/users'),
  adminUpdateUser: (id, patch) => request(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),

  scrape: (urls) => request('/scrape', { method: 'POST', body: JSON.stringify({ urls }) }),
  importPreview: async (file) => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/import/preview', { method: 'POST', body: form });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Upload failed: ${res.status}`);
    return data;
  },
  importCommit: (rows, mapping) => request('/import/commit', { method: 'POST', body: JSON.stringify({ rows, mapping }) }),
  listContacts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/contacts${qs ? `?${qs}` : ''}`);
  },
  approveContact: (id) => request(`/contacts/${id}/approve`, { method: 'POST' }),
  rejectContact: (id) => request(`/contacts/${id}/reject`, { method: 'POST' }),
  editDraft: (id, subject, body) => request(`/drafts/${id}`, { method: 'PATCH', body: JSON.stringify({ subject, body }) }),

  listCampaigns: () => request('/campaigns'),
  createCampaign: (fields) => request('/campaigns', { method: 'POST', body: JSON.stringify(fields) }),

  generateDrafts: (campaignId, contactIds) => request('/drafts/generate', { method: 'POST', body: JSON.stringify({ campaignId, contactIds }) }),
  draftStatus: () => request('/drafts/status'),

  listSenders: () => request('/senders'),
  send: (senderId, contactIds) => request('/send', { method: 'POST', body: JSON.stringify({ senderId, contactIds }) }),
  sendStatus: () => request('/send/status'),
  sendLog: () => request('/send/log'),
};
