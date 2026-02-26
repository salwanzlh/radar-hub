import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "viewer";
  is_active: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("access_token"));
  const [isLoading, setIsLoading] = useState(true);

  const clearAuth = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("access_token");
  }, []);

  const fetchMe = useCallback(async (accessToken: string): Promise<AuthUser | null> => {
    const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) return res.json();
    return null;
  }, []);

  const tryRefresh = useCallback(async (): Promise<string | null> => {
    const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (res.ok) {
      const data = await res.json();
      return data.access_token;
    }
    return null;
  }, []);

  useEffect(() => {
    (async () => {
      if (token) {
        const me = await fetchMe(token);
        if (me) {
          setUser(me);
          setIsLoading(false);
          return;
        }
        const newToken = await tryRefresh();
        if (newToken) {
          setToken(newToken);
          localStorage.setItem("access_token", newToken);
          const me2 = await fetchMe(newToken);
          if (me2) {
            setUser(me2);
            setIsLoading(false);
            return;
          }
        }
      }
      clearAuth();
      setIsLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.detail || "Login failed");
    }
    const data = await res.json();
    setToken(data.access_token);
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("user_email", email);
    const me = await fetchMe(data.access_token);
    setUser(me);
  };

  const logout = async () => {
    if (token) {
      await fetch(`${API_BASE}/api/v1/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      }).catch(() => {});
    }
    clearAuth();
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, isAdmin: user?.role === "admin", login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
