import axios from 'axios';

const AUTH_TOKEN_KEY = 'sera_token';
const AUTH_USER_KEY = 'sera_user';

const decodeJwtPayload = (token) => {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
};

export const isTokenUsable = (token) => {
  if (!token) return false;

  const payload = decodeJwtPayload(token);
  if (!payload) return false;
  if (!payload.exp) return true;

  return payload.exp * 1000 > Date.now();
};

export const clearStoredAuth = (notify = true) => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  if (notify) window.dispatchEvent(new Event('sera_auth_expired'));
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token && !isTokenUsable(token)) {
    clearStoredAuth();
    return Promise.reject(new axios.CanceledError('Session expirée'));
  }
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = String(error.response?.data?.message || '');
    const shouldLogout = status === 401 || (status === 403 && message.startsWith('Compte bloqué'));

    if (shouldLogout && localStorage.getItem(AUTH_TOKEN_KEY)) clearStoredAuth();
    return Promise.reject(error);
  }
);

export default api;
