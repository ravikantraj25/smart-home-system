import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);
const API_BASE = 'https://smart-home-system-5jfa.onrender.com';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('smarthome_token'));
  const [loading, setLoading] = useState(true);

  // ─── Verify token on mount ────────────────────────────────────────────────
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          // Token invalid — clear it
          localStorage.removeItem('smarthome_token');
          setToken(null);
          setUser(null);
        }
      } catch {
        // Network error — keep token, retry later
      }
      setLoading(false);
    };
    verifyToken();
  }, [token]);

  // ─── Signup ───────────────────────────────────────────────────────────────
  const signup = useCallback(async ({ name, email, password, phone }) => {
    const res = await fetch(`${API_BASE}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, phone }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Signup failed');

    localStorage.setItem('smarthome_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  // ─── Login ────────────────────────────────────────────────────────────────
  const login = useCallback(async ({ email, password }) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    localStorage.setItem('smarthome_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  // ─── Logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem('smarthome_token');
    setToken(null);
    setUser(null);
  }, []);

  // ─── Update Profile ───────────────────────────────────────────────────────
  const updateProfile = useCallback(async (updates) => {
    const res = await fetch(`${API_BASE}/api/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Update failed');
    setUser(data.user);
    return data;
  }, [token]);

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    signup,
    login,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
