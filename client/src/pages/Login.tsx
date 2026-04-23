import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";

export default function Login() {
  const [location, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const { login, user } = useAuth();

  useEffect(() => {
    if (window.location.search.includes("signup=true")) {
      setIsSignUp(true);
    }
  }, [location]);

  // If already logged in, redirect to dashboard
  if (user) {
    setLocation("/dashboard");
    return null;
  }

  const handleLogin = (role: "tenant" | "owner" | "admin" | "host" | "guest") => {
    setIsLoading(true);
    // Simulate network delay
    setTimeout(() => {
      login(role);
      setIsLoading(false);
    }, 800);
  };

  const handleSignUp = (role: "tenant" | "owner" | "admin" | "host" | "guest") => {
    setIsLoading(true);
    // Simulate sign up delay, then login
    setTimeout(() => {
      login(role);
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto flex items-center justify-center px-4 py-16">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold font-heading text-primary">
              {isSignUp ? "Create an Account" : "Welcome Back"}
            </CardTitle>
            <CardDescription>
              {isSignUp ? "Sign up to join the INNDOS community" : "Sign in to access your INNDOS dashboard"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="tenant" className="w-full">
              <TabsList className="grid w-full grid-cols-5 mb-8">
                <TabsTrigger value="tenant" className="text-xs px-1">Tenant</TabsTrigger>
                <TabsTrigger value="owner" className="text-xs px-1">Owner</TabsTrigger>
                <TabsTrigger value="host" className="text-xs px-1">Host</TabsTrigger>
                <TabsTrigger value="guest" className="text-xs px-1">Guest</TabsTrigger>
                <TabsTrigger value="admin" className="text-xs px-1">Admin</TabsTrigger>
              </TabsList>

              {["tenant", "owner", "host", "guest", "admin"].map((role) => (
                <TabsContent key={role} value={role}>
                  <div className="space-y-4">
                    {isSignUp && (
                      <div className="space-y-2">
                        <Label htmlFor={`name-${role}`}>Full Name</Label>
                        <Input id={`name-${role}`} placeholder="John Doe" />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor={`email-${role}`}>Email</Label>
                      <Input id={`email-${role}`} placeholder={`${role}@example.com`} defaultValue={isSignUp ? "" : `${role}@inndos.com`} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`password-${role}`}>Password</Label>
                      <Input id={`password-${role}`} type="password" defaultValue={isSignUp ? "" : `${role}123`} />
                    </div>
                    <Button 
                      className="w-full" 
                      variant={role === "admin" ? "default" : (role === "owner" || role === "guest" ? "secondary" : "default")}
                      onClick={() => isSignUp ? handleSignUp(role as any) : handleLogin(role as any)} 
                      disabled={isLoading}
                    >
                      {isLoading ? (isSignUp ? "Signing up..." : "Signing in...") : (isSignUp ? `Sign up as ${role.charAt(0).toUpperCase() + role.slice(1)}` : `Sign in as ${role.charAt(0).toUpperCase() + role.slice(1)}`)}
                    </Button>
                    {!isSignUp && (
                      <div className="text-center text-xs text-muted-foreground mt-4 bg-gray-100 p-2 rounded">
                        <span className="font-semibold">Demo Creds:</span> {role}@inndos.com / {role}123
                      </div>
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
          <CardFooter className="flex justify-center border-t p-4">
            <p className="text-xs text-muted-foreground">
              {isSignUp ? "Already have an account? " : "Don't have an account? "}
              <span 
                className="text-primary font-semibold cursor-pointer hover:underline" 
                onClick={() => setIsSignUp(!isSignUp)}
              >
                {isSignUp ? "Sign in" : "Sign up"}
              </span>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
