import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, UserCircle, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";

export default function Login() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (role: string) => {
    setIsLoading(true);
    // Simulate network delay
    setTimeout(() => {
      setIsLoading(false);
      // In a real app, we'd set auth state here
      setLocation(`/dashboard?role=${role}`);
    }, 1000);
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
              <TabsList className="grid w-full grid-cols-3 mb-8">
                <TabsTrigger value="tenant">Tenant</TabsTrigger>
                <TabsTrigger value="owner">Owner</TabsTrigger>
                <TabsTrigger value="admin">Admin</TabsTrigger>
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
