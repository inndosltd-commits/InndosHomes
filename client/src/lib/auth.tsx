import React, { createContext, useContext, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ADMINS, OWNERS, TENANTS, HOSTS, GUESTS, UserProfile } from "./mockData";

type UserRole = "tenant" | "owner" | "admin" | "host" | "guest" | null;

// Re-export UserProfile as User for compatibility with existing code
export type User = UserProfile;

interface AuthContextType {
  user: User | null;
  login: (role: UserRole, email?: string) => void;
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

  const login = (role: UserRole, email?: string) => {
    let mockUser: User | undefined;
    
    // If email is provided, try to find the specific user
    if (email) {
      if (role === "admin") mockUser = ADMINS.find(u => u.email === email);
      else if (role === "owner") mockUser = OWNERS.find(u => u.email === email);
      else if (role === "tenant") mockUser = TENANTS.find(u => u.email === email);
      else if (role === "host") mockUser = HOSTS.find(u => u.email === email);
      else if (role === "guest") mockUser = GUESTS.find(u => u.email === email);
    } 
    
    // Fallback to default demo users if no email provided or user not found
    if (!mockUser) {
      switch (role) {
        case "admin":
          mockUser = ADMINS[0];
          break;
        case "owner":
          mockUser = OWNERS[0];
          break;
        case "tenant":
          mockUser = TENANTS[0];
          break;
        case "host":
          mockUser = HOSTS[0];
          break;
        case "guest":
          mockUser = GUESTS[0];
          break;
      }
    }

    if (mockUser) {
      setUser(mockUser);
      localStorage.setItem("inndos_user", JSON.stringify(mockUser));
      setLocation("/dashboard");
    }
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
