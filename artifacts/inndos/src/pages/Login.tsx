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
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";

const ROLES = ["owner", "host", "admin"] as const;
type Role = typeof ROLES[number];

const DEMO_CREDS: Record<Role, { email: string; password: string }> = {
  owner: { email: "owner@inndos.com", password: "owner123" },
  host:  { email: "host@inndos.com",  password: "host123"  },
  admin: { email: "admin@inndos.com", password: "admin123" },
};

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;

export default function Login() {
  const [location, setLocation] = useLocation();
  const [isLoading, setIsLoading]           = useState(false);
  const [isSignUp, setIsSignUp]             = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const { login, signup, user, token: authToken } = useAuth();
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

  /* ── email/password sign-in ── */
  const handleLogin = async (role: Role) => {
    setIsLoading(true);
    try {
      const emailEl    = document.getElementById(`email-${role}`)    as HTMLInputElement | null;
      const passwordEl = document.getElementById(`password-${role}`) as HTMLInputElement | null;
      const email      = emailEl?.value    || DEMO_CREDS[role].email;
      const password   = passwordEl?.value || DEMO_CREDS[role].password;
      await login(email, password);
    } catch (err) {
      toast({ title: "Sign in failed", description: err instanceof Error ? err.message : "Invalid credentials.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  /* ── email/password sign-up ── */
  const handleSignUp = async (role: Role) => {
    setIsLoading(true);
    try {
      const nameEl     = document.getElementById(`name-${role}`)     as HTMLInputElement | null;
      const emailEl    = document.getElementById(`email-${role}`)    as HTMLInputElement | null;
      const passwordEl = document.getElementById(`password-${role}`) as HTMLInputElement | null;
      const name       = nameEl?.value    || "";
      const email      = emailEl?.value   || "";
      const password   = passwordEl?.value || "";
      if (!name || !email || !password) {
        toast({ title: "Missing fields", description: "Please fill in name, email, and password.", variant: "destructive" });
        return;
      }
      await signup(role, name, email, password);
    } catch (err) {
      toast({ title: "Sign up failed", description: err instanceof Error ? err.message : "Something went wrong.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  /* ── real Google OAuth ── */
  const handleGoogleSuccess = async (response: CredentialResponse, role: Role) => {
    if (!response.credential) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential, role }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || "Google sign-in failed");
      }
      const { token, user: googleUser } = await res.json() as { token: string; user: { name: string; email: string; role: string } };
      await login(googleUser.email, "", token);
    } catch (err) {
      toast({ title: "Google sign-in failed", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    toast({ title: "Google sign-in cancelled", description: "The sign-in window was closed or blocked.", variant: "destructive" });
  };

  /* ── forgot password (placeholder until email service is wired) ── */
  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsForgotPassword(false);
      toast({ title: "Email sent", description: "Password reset instructions sent to your email." });
    }, 800);
  };

  const googleConfigured = Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== "placeholder");

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
                : (isSignUp ? "Sign up to join the INNDOS community" : "Sign in to access your INNDOS dashboard")}
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
              <Tabs defaultValue="owner" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-8">
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
                          : (isSignUp
                            ? `Sign up as ${role.charAt(0).toUpperCase() + role.slice(1)}`
                            : `Sign in as ${role.charAt(0).toUpperCase() + role.slice(1)}`)}
                      </Button>

                      {/* ── Google Sign-In ── */}
                      {googleConfigured && (
                        <>
                          <div className="relative my-4">
                            <div className="absolute inset-0 flex items-center">
                              <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                              <span className="bg-white px-2 text-muted-foreground">Or continue with</span>
                            </div>
                          </div>

                          <div className="flex justify-center">
                            <GoogleLogin
                              onSuccess={(cr) => handleGoogleSuccess(cr, role)}
                              onError={handleGoogleError}
                              useOneTap={false}
                              text={isSignUp ? "signup_with" : "signin_with"}
                              shape="rectangular"
                              width="360"
                            />
                          </div>
                        </>
                      )}

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
