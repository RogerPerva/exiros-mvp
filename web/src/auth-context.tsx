import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { clearSession, getStoredUser, type AuthUser } from './api';

interface AuthContextValue {
  user: AuthUser | null;
  setUser: (u: AuthUser | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Provee el usuario autenticado a todo el portal (token vive en localStorage, ver api.ts). */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(getStoredUser());

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, setUser, logout }), [user, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fuera de <AuthProvider>');
  return ctx;
}
