import { useState, useEffect } from "react";

interface AuthState {
  isAuthenticated: boolean;
  user: { email: string } | null;
}

const AUTH_KEY = "gokite_admin_auth";

export function useAuth() {
  // TEMPORÁRIO: Bypass de autenticação para web scraping
  // Para reverter, restaure o código original que verifica localStorage
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
