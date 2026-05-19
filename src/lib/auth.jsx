import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setCsrf } from './api.js';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null, passwordIsDefault: false });

  const refresh = useCallback(async () => {
    try {
      const me = await api.get('/me');
      setCsrf(me.csrf);
      setState({ status: 'ready', user: me.user, passwordIsDefault: !!me.passwordIsDefault });
    } catch {
      setCsrf('');
      setState({ status: 'ready', user: null, passwordIsDefault: false });
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = useCallback(async (username, password) => {
    const res = await api.post('/login', { username, password });
    setCsrf(res.csrf);
    // After login, re-read /me to pick up passwordIsDefault from the server
    // (the login response doesn't carry it, and we want the banner to render
    // immediately rather than after the next reload).
    await refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try { await api.post('/logout'); } catch { /* ignore */ }
    setCsrf('');
    setState({ status: 'ready', user: null, passwordIsDefault: false });
    await refresh();
  }, [refresh]);

  return (
    <AuthCtx.Provider value={{ ...state, login, logout, refresh }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
