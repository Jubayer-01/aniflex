import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('aniflex_token') || null);
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('aniflex_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [authModalState, setAuthModalState] = useState({ isOpen: false, tab: 'login' });

  // On mount: if token exists, verify and refresh user profile from backend
  useEffect(() => {
    async function initAuth() {
      if (token) {
        try {
          const res = await authAPI.getMe();
          setUser(res.data.user);
          localStorage.setItem('aniflex_user', JSON.stringify(res.data.user));
        } catch (err) {
          console.warn('Session expired or invalid:', err.message);
          logout();
        }
      }
      setLoading(false);
    }
    initAuth();
  }, [token]);

  const login = async (email, password) => {
    const res = await authAPI.login(email, password);
    const { token: newToken, user: userData } = res.data;
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('aniflex_token', newToken);
    localStorage.setItem('aniflex_user', JSON.stringify(userData));
    closeAuthModal();
    window.dispatchEvent(new CustomEvent('aniflex:watchHistoryUpdate'));
    return userData;
  };

  const register = async (username, email, password) => {
    const res = await authAPI.register(username, email, password);
    const { token: newToken, user: userData } = res.data;
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('aniflex_token', newToken);
    localStorage.setItem('aniflex_user', JSON.stringify(userData));
    closeAuthModal();
    window.dispatchEvent(new CustomEvent('aniflex:watchHistoryUpdate'));
    return userData;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('aniflex_token');
    localStorage.removeItem('aniflex_user');
    window.dispatchEvent(new CustomEvent('aniflex:watchHistoryUpdate'));
  };

  const updateProfile = async (data) => {
    const res = await authAPI.updateProfile(data);
    setUser(res.data.user);
    localStorage.setItem('aniflex_user', JSON.stringify(res.data.user));
    return res.data.user;
  };

  const openAuthModal = (tab = 'login') => {
    setAuthModalState({ isOpen: true, tab });
  };

  const closeAuthModal = () => {
    setAuthModalState({ isOpen: false, tab: 'login' });
  };

  const value = {
    token,
    user,
    isAuthenticated: Boolean(token && user),
    loading,
    login,
    register,
    logout,
    updateProfile,
    authModalState,
    openAuthModal,
    closeAuthModal,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

