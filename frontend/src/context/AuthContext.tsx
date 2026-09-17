// ============================================================
// CodeQuest — Auth Context
// ============================================================

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../api/client';
import { CodingLanguage } from '../../../shared/src/types';

interface User {
  id: number;
  username: string;
  email: string;
  role: 'learner' | 'parent' | 'teacher' | 'admin';
  display_name: string;
  avatar_url: string;
  enrollment_key?: string;
  preferred_coding_language?: CodingLanguage;
  coding_streak_count?: number;
  last_coding_streak_date?: string | null;
  all_lessons_unlocked?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  updatePreferredLanguage: (lang: CodingLanguage) => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const res = await api.getMe();
      setUser(res.data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('codequest_token');
    if (token) {
      api.getMe()
        .then((res) => setUser(res.data))
        .catch(() => {
          localStorage.removeItem('codequest_token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    const res = await api.login(username, password);
    localStorage.setItem('codequest_token', res.data.token);
    setUser(res.data.user);
  };

  const register = async (data: any) => {
    const res = await api.register(data);
    localStorage.setItem('codequest_token', res.data.token);
    setUser(res.data.user);
  };

  const logout = () => {
    localStorage.removeItem('codequest_token');
    setUser(null);
  };

  const updatePreferredLanguage = async (lang: CodingLanguage) => {
    try {
      await api.updateLanguagePreference(lang);
      setUser((prev) => (prev ? { ...prev, preferred_coding_language: lang } : null));
    } catch (err) {
      console.error('Failed to update language preference:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updatePreferredLanguage,
        refreshUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
