import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sera_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = String(error.response?.data?.message || '');
    const shouldLogout = status === 401 || (status === 403 && message.startsWith('Compte bloqué'));

    if (shouldLogout && localStorage.getItem('sera_token')) {
      localStorage.removeItem('sera_token');
      localStorage.removeItem('sera_user');
      window.dispatchEvent(new Event('sera_auth_expired'));
    }
    return Promise.reject(error);
  }
);

export default api;
