const BASE = '/api';

async function request(path, options = {}) {
  const url = `${BASE}${path}`;
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };

  // Don't set Content-Type for FormData
  if (options.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  const res = await fetch(url, config);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export const api = {
  // Items
  getDashboard: () => request('/items?dashboard=true'),
  getItems: (status) => request(`/items${status ? `?status=${status}` : ''}`),
  getItem: (id) => request(`/items/${id}`),
  createItem: (data) => request('/items', { method: 'POST', body: JSON.stringify(data) }),
  updateItem: (id, data) => request(`/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteItem: (id) => request(`/items/${id}`, { method: 'DELETE' }),

  // Logs
  addLog: (itemId, data) => request(`/items/${itemId}/logs`, { method: 'POST', body: JSON.stringify(data) }),
  snooze: (itemId, snoozed_until) => request(`/items/${itemId}/snooze`, { method: 'POST', body: JSON.stringify({ snoozed_until }) }),

  // Search
  search: (q) => request(`/search?q=${encodeURIComponent(q)}`),

  // Categories
  getCategories: () => request('/categories'),

  // Import
  importPreview: (file) => {
    const form = new FormData();
    form.append('file', file);
    return request('/import/preview', { method: 'POST', body: form });
  },
  importConfirm: (items) => request('/import/confirm', { method: 'POST', body: JSON.stringify({ items }) }),

  // Stats
  getSpendByCategory: () => request('/stats/spend-by-category'),
  getUpcomingCosts: (days) => request(`/stats/upcoming-costs${days ? `?days=${days}` : ''}`),
  getSubscriptions: () => request('/stats/subscriptions'),
  getIntervals: () => request('/stats/intervals'),
};
