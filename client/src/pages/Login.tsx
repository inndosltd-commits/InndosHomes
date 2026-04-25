import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation, Link } from "wouter";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Checkbox } from "@/components/ui/checkbox";

export default function Login() {
  const [location, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const { login, signup, user } = useAuth();

  useEffect(() => {
    if (window.location.search.includes("signup=true") || window.location.hash.includes("signup=true")) {
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
    const emailInput = document.getElementById(`email-${role}`) as HTMLInputElement;
    const email = emailInput?.value || "";
    
    // Simulate network delay
    setTimeout(() => {
      login(role, email);
      setIsLoading(false);
    }, 800);
  };

  const handleSignUp = (role: "tenant" | "owner" | "admin" | "host" | "guest") => {
    setIsLoading(true);
    const nameInput = document.getElementById(`name-${role}`) as HTMLInputElement;
    const emailInput = document.getElementById(`email-${role}`) as HTMLInputElement;
    
    const name = nameInput?.value || "";
    const email = emailInput?.value || "";
    
    // Simulate sign up delay, then login
    setTimeout(() => {
      signup(role, name, email);
      setIsLoading(false);
    }, 800);
  };

  const handleSocialAuth = (provider: string, role: "tenant" | "owner" | "admin" | "host" | "guest") => {
    setIsLoading(true);
    setTimeout(() => {
      if (isSignUp) {
        signup(role, `New ${provider} User`, `user@${provider.toLowerCase()}.com`);
      } else {
        login(role);
      }
      setIsLoading(false);
    }, 800);
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate network delay
    setTimeout(() => {
      setIsLoading(false);
      setIsForgotPassword(false);
      // In a real app, we'd show a success toast here
      alert("Password reset instructions have been sent to your email.");
    }, 800);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto flex items-center justify-center px-4 py-16">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold font-heading text-primary">
              {isForgotPassword ? "Reset Password" : (isSignUp ? "Create an Account" : "Welcome Back")}
            </CardTitle>
            <CardDescription>
              {isForgotPassword 
                ? "Enter your email address and we'll send you instructions to reset your password."
                : (isSignUp ? "Sign up to join the INNDOS community" : "Sign in to access your INNDOS dashboard")
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isForgotPassword ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email Address</Label>
                  <Input id="reset-email" type="email" placeholder="name@example.com" required />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Sending..." : "Send Reset Instructions"}
                </Button>
                <div className="text-center mt-4">
                  <Button variant="link" onClick={() => setIsForgotPassword(false)} className="text-sm">
                    Back to login
                  </Button>
                </div>
              </form>
            ) : (
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
                  <div className="space-y-4" key={isSignUp ? "signup" : "login"}>
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
                    
                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-muted-foreground">
                          Or continue with
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 justify-center">
                      <Button variant="outline" className="w-full" onClick={() => handleSocialAuth("Google", role as any)} disabled={isLoading}>
                        <svg className="h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path></svg>
                      </Button>
                      <Button variant="outline" className="w-full" onClick={() => handleSocialAuth("Facebook", role as any)} disabled={isLoading}>
                        <svg className="h-5 w-5 text-[#1877F2]" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="facebook" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M504 256C504 119 393 8 256 8S8 119 8 256c0 123.78 90.69 226.38 209.25 245V327.69h-63V256h63v-54.64c0-62.15 37-96.48 93.67-96.48 27.14 0 55.52 4.84 55.52 4.84v61h-31.28c-30.8 0-40.41 19.12-40.41 38.73V256h68.78l-11 71.69h-57.78V501C413.31 482.38 504 379.78 504 256z"></path></svg>
                      </Button>
                      <Button variant="outline" className="w-full" onClick={() => handleSocialAuth("LinkedIn", role as any)} disabled={isLoading}>
                        <svg className="h-5 w-5 text-[#0A66C2]" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="linkedin" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="currentColor" d="M100.28 448H7.4V148.9h92.88zM53.79 108.1C24.09 108.1 0 83.5 0 53.8a53.79 53.79 0 0 1 107.58 0c0 29.7-24.1 54.3-53.79 54.3zM447.9 448h-92.68V302.4c0-34.7-.7-79.2-48.29-79.2-48.29 0-55.69 37.7-55.69 76.7V448h-92.78V148.9h89.08v40.8h1.3c12.4-23.5 42.69-48.3 87.88-48.3 94 0 111.28 61.9 111.28 142.3V448z"></path></svg>
                      </Button>
                    </div>

                    {isSignUp && (
                      <div className="flex items-start space-x-2 mt-4 pt-2">
                        <Checkbox id={`terms-${role}`} className="mt-1" />
                        <label htmlFor={`terms-${role}`} className="text-sm text-gray-500 leading-tight">
                          I agree to the <Link href="/terms" className="text-primary hover:underline font-medium">Terms and Conditions</Link> and acknowledge that I have read the privacy policy.
                        </label>
                      </div>
                    )}
                    {!isSignUp && (
                      <div className="flex justify-end mt-2">
                        <Button variant="link" className="text-xs px-0 h-auto font-medium" onClick={() => setIsForgotPassword(true)}>
                          Forgot Password?
                        </Button>
                      </div>
                    )}
                    {!isSignUp && (
                      <div className="text-center text-xs text-muted-foreground mt-4 bg-gray-100 p-2 rounded">
                        <span className="font-semibold">Demo Creds:</span> {role}@inndos.com {"/"} {role}123
                      </div>
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
            )}
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
