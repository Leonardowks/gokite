import { useState, useEffect } from "react";

interface AuthState {
  isAuthenticated: boolean;
  user: { email: string } | null;
}

const AUTH_KEY = "gokite_admin_auth";

/**
 * =====================================================
 * ⚠️  SEGURANÇA TEMPORARIAMENTE DESATIVADA  ⚠️
 * =====================================================
 * 
 * Bypass ativo para web scraping/crawling externo.
 * 
 * PARA REATIVAR A AUTENTICAÇÃO, substitua o useState abaixo por:
 * 
 * const [authState, setAuthState] = useState<AuthState>(() => {
 *   const stored = localStorage.getItem(AUTH_KEY);
 *   return stored ? JSON.parse(stored) : { isAuthenticated: false, user: null };
 * });
 * 
 * E descomente o bloco de redirecionamento em AdminLayout.tsx
 * =====================================================
 */
export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: true,
    user: { email: "scraping@gokite.com" }
  });

  const login = (email: string, password: string): boolean => {
    // Credenciais mock para demo
    if (email === "admin@gokite.com" && password === "admin123") {
      const newState = { isAuthenticated: true, user: { email } };
      setAuthState(newState);
      localStorage.setItem(AUTH_KEY, JSON.stringify(newState));
      return true;
    }
    return false;
  };

  const logout = () => {
    const newState = { isAuthenticated: false, user: null };
    setAuthState(newState);
    localStorage.removeItem(AUTH_KEY);
  };

  return {
    ...authState,
    login,
    logout,
  };
}
