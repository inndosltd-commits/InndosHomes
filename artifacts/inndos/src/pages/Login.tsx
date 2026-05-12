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
import { useToast } from "@/hooks/use-toast";

const ROLES = ["tenant", "owner", "host", "guest", "admin"] as const;
type Role = typeof ROLES[number];

const DEMO_CREDS: Record<Role, { email: string; password: string }> = {
  tenant: { email: "tenant@inndos.com", password: "tenant123" },
  owner: { email: "owner@inndos.com", password: "owner123" },
  host: { email: "host@inndos.com", password: "host123" },
  guest: { email: "guest@inndos.com", password: "guest123" },
  admin: { email: "admin@inndos.com", password: "admin123" },
};

export default function Login() {
  const [location, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const { login, signup, user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (window.location.search.includes("signup=true") || window.location.hash.includes("signup=true")) {
      setIsSignUp(true);
    }
  }, [location]);

  if (user) {
    setLocation("/dashboard");
    return null;
  }

  const handleLogin = async (role: Role) => {
    setIsLoading(true);
    const emailInput = document.getElementById(`email-${role}`) as HTMLInputElement;
    const passwordInput = document.getElementById(`password-${role}`) as HTMLInputElement;
    const email = emailInput?.value || DEMO_CREDS[role].email;
    const password = passwordInput?.value || DEMO_CREDS[role].password;
    try {
      await login(email, password);
    } catch (err) {
      toast({
        title: "Login failed",
        description: err instanceof Error ? err.message : "Please check your credentials.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (role: Role) => {
    setIsLoading(true);
    const nameInput = document.getElementById(`name-${role}`) as HTMLInputElement;
    const emailInput = document.getElementById(`email-${role}`) as HTMLInputElement;
    const passwordInput = document.getElementById(`password-${role}`) as HTMLInputElement;

    const name = nameInput?.value || "";
    const email = emailInput?.value || "";
    const password = passwordInput?.value || "";

    if (!name || !email || !password) {
      toast({ title: "Missing fields", description: "Please fill in all fields.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    try {
      await signup(role, name, email, password);
    } catch (err) {
      toast({
        title: "Sign up failed",
        description: err instanceof Error ? err.message : "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialAuth = async (provider: string, role: Role) => {
    setIsLoading(true);
    try {
      if (isSignUp) {
        await signup(role, `New ${provider} User`, `user_${Date.now()}@${provider.toLowerCase()}.social`, "socialpass123");
      } else {
        await login(DEMO_CREDS[role].email, DEMO_CREDS[role].password);
      }
    } catch (err) {
      toast({ title: "Auth failed", description: err instanceof Error ? err.message : "Authentication failed.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsForgotPassword(false);
      toast({ title: "Email sent", description: "Password reset instructions sent to your email." });
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
                ? "Enter your email and we'll send reset instructions."
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
                  {ROLES.map((role) => (
                    <TabsTrigger key={role} value={role} className="text-xs px-1">
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {ROLES.map((role) => (
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
                        <Input
                          id={`email-${role}`}
                          type="email"
                          placeholder={`${role}@example.com`}
                          defaultValue={isSignUp ? "" : DEMO_CREDS[role].email}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`password-${role}`}>Password</Label>
                        <Input
                          id={`password-${role}`}
                          type="password"
                          defaultValue={isSignUp ? "" : DEMO_CREDS[role].password}
                        />
                      </div>
                      <Button
                        className="w-full"
                        onClick={() => isSignUp ? handleSignUp(role) : handleLogin(role)}
                        disabled={isLoading}
                      >
                        {isLoading
                          ? (isSignUp ? "Signing up..." : "Signing in...")
                          : (isSignUp ? `Sign up as ${role.charAt(0).toUpperCase() + role.slice(1)}` : `Sign in as ${role.charAt(0).toUpperCase() + role.slice(1)}`)}
                      </Button>

                      <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-white px-2 text-muted-foreground">Or continue with</span>
                        </div>
                      </div>

                      <div className="flex gap-2 justify-center">
                        <Button variant="outline" className="w-full" onClick={() => handleSocialAuth("Google", role)} disabled={isLoading}>
                          <svg className="h-5 w-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path></svg>
                        </Button>
                        <Button variant="outline" className="w-full" onClick={() => handleSocialAuth("Facebook", role)} disabled={isLoading}>
                          <svg className="h-5 w-5 text-[#1877F2]" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M504 256C504 119 393 8 256 8S8 119 8 256c0 123.78 90.69 226.38 209.25 245V327.69h-63V256h63v-54.64c0-62.15 37-96.48 93.67-96.48 27.14 0 55.52 4.84 55.52 4.84v61h-31.28c-30.8 0-40.41 19.12-40.41 38.73V256h68.78l-11 71.69h-57.78V501C413.31 482.38 504 379.78 504 256z"></path></svg>
                        </Button>
                        <Button variant="outline" className="w-full" onClick={() => handleSocialAuth("LinkedIn", role)} disabled={isLoading}>
                          <svg className="h-5 w-5 text-[#0A66C2]" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="currentColor" d="M100.28 448H7.4V148.9h92.88zM53.79 108.1C24.09 108.1 0 83.5 0 53.8a53.79 53.79 0 0 1 107.58 0c0 29.7-24.1 54.3-53.79 54.3zM447.9 448h-92.68V302.4c0-34.7-.7-79.2-48.29-79.2-48.29 0-55.69 37.7-55.69 76.7V448h-92.78V148.9h89.08v40.8h1.3c12.4-23.5 42.69-48.3 87.88-48.3 94 0 111.28 61.9 111.28 142.3V448z"></path></svg>
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
                        <>
                          <div className="flex justify-end mt-2">
                            <Button variant="link" className="text-xs px-0 h-auto font-medium" onClick={() => setIsForgotPassword(true)}>
                              Forgot Password?
                            </Button>
                          </div>
                          <div className="text-center text-xs text-muted-foreground mt-4 bg-gray-100 p-2 rounded">
                            <span className="font-semibold">Demo Creds:</span> {DEMO_CREDS[role].email} / {DEMO_CREDS[role].password}
                          </div>
                        </>
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
