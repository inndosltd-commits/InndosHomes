import React, { createContext, useContext, useState, useEffect } from "react";
import { useLocation } from "wouter";

type UserRole = "tenant" | "owner" | "admin" | "host" | "guest" | null;

export interface User {
  id: string;
  name: string;
  email: string;
  role: "owner" | "tenant" | "admin" | "host" | "guest";
  status: "active" | "pending" | "suspended";
  joinDate: string;
  avatar?: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (role: UserRole, name: string, email: string, password?: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = "/api";

async function apiFetch(path: string, options?: RequestInit, token?: string | null) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...(options?.headers as Record<string, string> || {}) },
  });
  return res;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const storedToken = localStorage.getItem("inndos_token");
    if (storedToken) {
      setToken(storedToken);
      apiFetch("/auth/me", undefined, storedToken)
        .then(async (res) => {
          if (res.ok) {
            const u = await res.json();
            setUser(u);
          } else {
            localStorage.removeItem("inndos_token");
            setToken(null);
          }
        })
        .catch(() => {
          localStorage.removeItem("inndos_token");
          setToken(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    const res = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Login failed");
    }
    const { token: newToken, user: newUser } = await res.json();
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("inndos_token", newToken);
    setLocation("/dashboard");
  };

  const signup = async (role: UserRole, name: string, email: string, password?: string) => {
    setError(null);
    if (!role) return;
    const res = await apiFetch("/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: name || `New ${role}`,
        email: email || `${role}_${Date.now()}@inndos.com`,
        password: password || "password123",
        role,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Signup failed");
    }
    const { token: newToken, user: newUser } = await res.json();
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("inndos_token", newToken);
    setLocation("/dashboard");
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("inndos_token");
    setLocation("/");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, signup, logout, isLoading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
