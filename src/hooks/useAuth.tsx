import { useState, useEffect } from "react";

interface AuthState {
  isAuthenticated: boolean;
  user: { email: string } | null;
}

const AUTH_KEY = "gokite_admin_auth";

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>(() => {
    const stored = localStorage.getItem(AUTH_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return { isAuthenticated: false, user: null };
      }
    }
    return { isAuthenticated: false, user: null };
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
