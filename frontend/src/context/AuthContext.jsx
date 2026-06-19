import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api, { clearStoredAuth, isTokenUsable } from '../services/api';

const AuthContext = createContext(null);

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem('sera_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    localStorage.removeItem('sera_user');
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => {
    const storedToken = localStorage.getItem('sera_token');
    if (!isTokenUsable(storedToken)) {
      clearStoredAuth(false);
      return null;
    }
    return storedToken;
  });
  const [user, setUser] = useState(() => (isTokenUsable(localStorage.getItem('sera_token')) ? getStoredUser() : null));

  const persist = (payload) => {
    localStorage.setItem('sera_token', payload.token);
    localStorage.setItem('sera_user', JSON.stringify(payload.user));
    setToken(payload.token);
    setUser(payload.user);
  };

  const login = async (credentials) => {
    const { data } = await api.post('/auth/login', credentials);
    persist(data);
    return data.user;
  };

  const register = async (values) => {
    const { data } = await api.post('/auth/register', values);
    persist(data);
    return data.user;
  };

  const logout = () => {
    clearStoredAuth(false);
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    window.addEventListener('sera_auth_expired', logout);
    return () => window.removeEventListener('sera_auth_expired', logout);
  }, []);

  const updateProfile = async (values) => {
    const { data } = await api.put('/auth/me', values, {
      headers: values instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    });
    localStorage.setItem('sera_user', JSON.stringify(data));
    setUser(data);
    return data;
  };

  const value = useMemo(
    () => ({ token, user, isAuthenticated: Boolean(token), login, register, logout, updateProfile }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
