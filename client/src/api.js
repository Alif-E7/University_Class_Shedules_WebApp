const API = '/api';

function getToken() { return localStorage.getItem('adminToken'); }
function getUser() {
  try { return JSON.parse(localStorage.getItem('adminUser') || 'null'); } catch { return null; }
}

export async function api(path, options = {}) {
  const headers = { ...options.headers };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || 'Request failed');
  return data;
}

export const auth = {
  login: (email, password) => api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => api('/auth/me'),
  logout: () => { localStorage.removeItem('adminToken'); localStorage.removeItem('adminUser'); },
  setToken: (token) => localStorage.setItem('adminToken', token),
  setUser: (user) => localStorage.setItem('adminUser', JSON.stringify(user)),
  isLoggedIn: () => !!getToken(),
  getUser,
  isCentralAdmin: () => getUser()?.role === 'central_admin',
  isDeptAdmin: () => getUser()?.role === 'dept_admin',
};

export const departments = {
  list: () => api('/departments'),
  get: (id) => api(`/departments/${id}`),
  create: (body) => api('/departments', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => api(`/departments/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id) => api(`/departments/${id}`, { method: 'DELETE' }),
};

export const teachers = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return api(`/teachers${q ? `?${q}` : ''}`);
  },
  get: (id) => api(`/teachers/${id}`),
  create: (body) => api('/teachers', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => api(`/teachers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id) => api(`/teachers/${id}`, { method: 'DELETE' }),
};

export const courses = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return api(`/courses${q ? `?${q}` : ''}`);
  },
  get: (id) => api(`/courses/${id}`),
  create: (body) => api('/courses', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => api(`/courses/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id) => api(`/courses/${id}`, { method: 'DELETE' }),
};

export const offerings = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return api(`/offerings${q ? `?${q}` : ''}`);
  },
  get: (id) => api(`/offerings/${id}`),
  create: (body) => api('/offerings', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => api(`/offerings/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id) => api(`/offerings/${id}`, { method: 'DELETE' }),
};

export const schedules = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return api(`/schedules${q ? `?${q}` : ''}`);
  },
  weekly: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return api(`/schedules/weekly${q ? `?${q}` : ''}`);
  },
  today: () => api('/schedules/today'),
  room: (roomId) => api(`/schedules/room/${roomId}`),
  create: (body) => api('/schedules', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => api(`/schedules/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id) => api(`/schedules/${id}`, { method: 'DELETE' }),
};

export const rooms = {
  list: () => api('/rooms'),
  get: (id) => api(`/rooms/${id}`),
  create: (body) => api('/rooms', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => api(`/rooms/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id) => api(`/rooms/${id}`, { method: 'DELETE' }),
};

export const terms = {
  list: () => api('/terms'),
  create: (body) => api('/terms', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => api(`/terms/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id) => api(`/terms/${id}`, { method: 'DELETE' }),
};

export const users = {
  list: () => api('/users'),
  create: (body) => api('/users', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => api(`/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id) => api(`/users/${id}`, { method: 'DELETE' }),
};

export const analytics = {
  dashboard: () => api('/analytics/dashboard'),
  conflicts: () => api('/analytics/conflicts'),
};

export const home = {
  homepage: () => api('/home/homepage'),
};

export const importApi = {
  preview: async (file, type = 'all') => {
    const fd = new FormData();
    fd.append('file', file);
    const token = getToken();
    const res = await fetch(`${API}/import/preview?type=${type}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Preview failed');
    return data;
  },
  confirm: (batchId, termId) => api(`/import/confirm/${batchId}`, {
    method: 'POST',
    body: JSON.stringify({ term_id: termId }),
  }),
  reject: (batchId) => api(`/import/reject/${batchId}`, { method: 'POST' }),
  upload: async (file, type = 'all') => {
    const fd = new FormData();
    fd.append('file', file);
    const token = getToken();
    const res = await fetch(`${API}/import/upload?type=${type}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data;
  },
  history: () => api('/import/history'),
};

export function exportUrl(type, teacherId) {
  return `${API}/export/${type}/teacher/${teacherId}`;
}

export function formatTime(t) {
  if (!t) return '';
  return String(t).slice(0, 5);
}

export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
