import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('sera_token'));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('sera_user');
    return raw ? JSON.parse(raw) : null;
  });

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
    localStorage.removeItem('sera_token');
    localStorage.removeItem('sera_user');
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
