import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import { useState } from "react";
import { useAuth } from "@/lib/auth";

export default function Login() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const { login, user } = useAuth();

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto flex items-center justify-center px-4 py-16">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold font-heading text-primary">Welcome Back</CardTitle>
            <CardDescription>Sign in to access your INNDOS dashboard</CardDescription>
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

              <TabsContent value="tenant">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-tenant">Email</Label>
                    <Input id="email-tenant" placeholder="tenant@example.com" defaultValue="tenant@inndos.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-tenant">Password</Label>
                    <Input id="password-tenant" type="password" defaultValue="tenant123" />
                  </div>
                  <Button className="w-full" onClick={() => handleLogin('tenant')} disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign in as Tenant"}
                  </Button>
                  <div className="text-center text-xs text-muted-foreground mt-4 bg-gray-100 p-2 rounded">
                    <span className="font-semibold">Demo Creds:</span> tenant@inndos.com / tenant123
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="owner">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-owner">Email</Label>
                    <Input id="email-owner" placeholder="owner@example.com" defaultValue="owner@inndos.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-owner">Password</Label>
                    <Input id="password-owner" type="password" defaultValue="owner123" />
                  </div>
                  <Button className="w-full bg-secondary hover:bg-secondary/90" onClick={() => handleLogin('owner')} disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign in as Owner"}
                  </Button>
                  <div className="text-center text-xs text-muted-foreground mt-4 bg-gray-100 p-2 rounded">
                    <span className="font-semibold">Demo Creds:</span> owner@inndos.com / owner123
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="host">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-host">Email</Label>
                    <Input id="email-host" placeholder="host@inndos.com" defaultValue="host@inndos.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-host">Password</Label>
                    <Input id="password-host" type="password" defaultValue="host123" />
                  </div>
                  <Button className="w-full bg-primary hover:bg-primary/90" onClick={() => handleLogin('host')} disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign in as Host"}
                  </Button>
                  <div className="text-center text-xs text-muted-foreground mt-4 bg-gray-100 p-2 rounded">
                    <span className="font-semibold">Demo Creds:</span> host@inndos.com / host123
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="guest">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-guest">Email</Label>
                    <Input id="email-guest" placeholder="guest@inndos.com" defaultValue="guest@inndos.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-guest">Password</Label>
                    <Input id="password-guest" type="password" defaultValue="guest123" />
                  </div>
                  <Button className="w-full bg-secondary hover:bg-secondary/90" onClick={() => handleLogin('guest')} disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign in as Guest"}
                  </Button>
                  <div className="text-center text-xs text-muted-foreground mt-4 bg-gray-100 p-2 rounded">
                    <span className="font-semibold">Demo Creds:</span> guest@inndos.com / guest123
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="admin">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-admin">Email</Label>
                    <Input id="email-admin" placeholder="admin@inndos.com" defaultValue="admin@inndos.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-admin">Password</Label>
                    <Input id="password-admin" type="password" defaultValue="admin123" />
                  </div>
                  <Button className="w-full bg-gray-900 hover:bg-black" onClick={() => handleLogin('admin')} disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign in as SuperAdmin"}
                  </Button>
                  <div className="text-center text-xs text-muted-foreground mt-4 bg-gray-100 p-2 rounded">
                    <span className="font-semibold">Demo Creds:</span> admin@inndos.com / admin123
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex justify-center border-t p-4">
            <p className="text-xs text-muted-foreground">Don't have an account? <span className="text-primary font-semibold cursor-pointer">Sign up</span></p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
