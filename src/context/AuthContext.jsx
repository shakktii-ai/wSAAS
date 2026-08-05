import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import api from '@/services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const checkAuth = async () => {
    try {
      setLoading(true);
      const res = await api.get('/auth/me');
      if (res.success && res.data) {
        setUser(res.data.user);
        setCompany(res.data.company);
      } else {
        setUser(null);
        setCompany(null);
      }
    } catch (err) {
      setUser(null);
      setCompany(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const loginUser = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.success && res.data) {
      setUser(res.data.user);
      setCompany(res.data.company);
      router.push('/dashboard');
    }
    return res;
  };

  const registerUser = async (companyName, name, email, password) => {
    const res = await api.post('/auth/register', { companyName, name, email, password });
    if (res.success && res.data) {
      setUser(res.data.user);
      setCompany(res.data.company);
      router.push('/dashboard');
    }
    return res;
  };

  const socialLoginUser = async (payload) => {
    const res = await api.post('/auth/social', payload);
    if (res.success && res.data) {
      setUser(res.data.user);
      setCompany(res.data.company);
      router.push('/dashboard');
    }
    return res;
  };

  const logoutUser = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Ignore
    } finally {
      setUser(null);
      setCompany(null);
      router.push('/login');
    }
  };

  const refreshCompany = async () => {
    try {
      const res = await api.get('/company');
      if (res.success && res.data) {
        setCompany(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        loading,
        login: loginUser,
        register: registerUser,
        socialLogin: socialLoginUser,
        logout: logoutUser,
        checkAuth,
        refreshCompany,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
