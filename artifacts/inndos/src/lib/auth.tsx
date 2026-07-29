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
  phone?: string | null;
  phoneVerified?: boolean;
  idDocument?: string | null;
  idFront?: string | null;
  idBack?: string | null;
  isRegisteredFirm?: boolean;
  firmType?: "business_name" | "registered_company" | null;
  firmCertRegistration?: string | null;
  firmCertIncorporation?: string | null;
  firmCr12?: string | null;
  firmDirectorIds?: string[];
  businessCertRegistration?: string | null;
  businessPermit?: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string, preexistingToken?: string) => Promise<void>;
  signup: (role: UserRole, name: string, email: string, password?: string, phoneToken?: string, extra?: { isRegisteredFirm?: boolean; firmType?: string }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
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

  const login = async (email: string, password: string, preexistingToken?: string) => {
    setError(null);
    if (preexistingToken) {
      // Google OAuth path: token already verified by backend, just fetch the user profile
      const res = await apiFetch("/auth/me", undefined, preexistingToken);
      if (!res.ok) throw new Error("Failed to load user profile");
      const newUser = await res.json();
      setToken(preexistingToken);
      setUser(newUser);
      localStorage.setItem("inndos_token", preexistingToken);
      setLocation("/dashboard");
      return;
    }
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

  const signup = async (role: UserRole, name: string, email: string, password?: string, phoneToken?: string, extra?: { isRegisteredFirm?: boolean; firmType?: string }) => {
    setError(null);
    if (!role) return;
    const res = await apiFetch("/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: name || `New ${role}`,
        email: email || `${role}_${Date.now()}@inndos.com`,
        password: password || "password123",
        role,
        ...(phoneToken ? { phoneToken } : {}),
        ...(extra ?? {}),
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

  const refreshUser = async () => {
    const t = token ?? localStorage.getItem("inndos_token");
    if (!t) return;
    try {
      const res = await apiFetch("/auth/me", undefined, t);
      if (res.ok) setUser(await res.json());
    } catch { /* non-critical */ }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("inndos_token");
    window.location.replace("/");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, signup, logout, refreshUser, isLoading, error }}>
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
