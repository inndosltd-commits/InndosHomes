import React, { createContext, useContext, useState, useEffect } from "react";
import { useLocation } from "wouter";

type UserRole = "tenant" | "owner" | "admin" | null;

interface User {
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  login: (role: UserRole) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Check for existing session in localStorage on mount
    const storedUser = localStorage.getItem("inndos_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = (role: UserRole) => {
    let mockUser: User;
    
    switch (role) {
      case "admin":
        mockUser = { name: "Super Admin", email: "admin@inndos.com", role: "admin" };
        break;
      case "owner":
        mockUser = { name: "John Landlord", email: "owner@inndos.com", role: "owner" };
        break;
      case "tenant":
        mockUser = { name: "Sarah Tenant", email: "tenant@inndos.com", role: "tenant" };
        break;
      default:
        return;
    }

    setUser(mockUser);
    localStorage.setItem("inndos_user", JSON.stringify(mockUser));
    setLocation("/dashboard");
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("inndos_user");
    setLocation("/");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
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
