import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation, Link } from "wouter";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";

const LOGIN_ROLES  = ["owner", "host", "admin"]          as const;
const SIGNUP_ROLES = ["owner", "host", "tenant", "admin"] as const;
type Role = typeof SIGNUP_ROLES[number];

const DEMO_CREDS: Record<typeof LOGIN_ROLES[number], { email: string; password: string }> = {
  owner: { email: "owner@inndos.com",  password: "owner123"  },
  host:  { email: "host@inndos.com",   password: "host123"   },
  admin: { email: "admin@inndos.com",  password: "admin123"  },
};

const GOOGLE_CLIENT_ID   = import.meta.env.VITE_GOOGLE_CLIENT_ID   as string;
const FACEBOOK_APP_ID    = import.meta.env.VITE_FACEBOOK_APP_ID    as string;
const LINKEDIN_CLIENT_ID = import.meta.env.VITE_LINKEDIN_CLIENT_ID as string;

declare global {
  interface Window {
    FB?: {
      init: (opts: Record<string, unknown>) => void;
      login: (cb: (r: { authResponse?: { accessToken: string } }) => void, opts?: Record<string, unknown>) => void;
    };
    fbAsyncInit?: () => void;
  }
}

export default function Login() {
  const [location, setLocation] = useLocation();
  const [isLoading, setIsLoading]           = useState(false);
  const [isSignUp, setIsSignUp]             = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [termsAccepted, setTermsAccepted]   = useState(false);
  const { login, signup, user, token: authToken } = useAuth();
  const { toast } = useToast();
  const linkedinPopup = useRef<Window | null>(null);

  useEffect(() => {
    if (window.location.search.includes("signup=true") || window.location.hash.includes("signup=true")) {
      setIsSignUp(true);
    }
  }, [location]);

  useEffect(() => {
    if (user) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  if (user) {
    return null;
  }

  /* ── email/password sign-in ── */
  const handleLogin = async (role: Role) => {
    setIsLoading(true);
    try {
      const emailEl    = document.getElementById(`email-${role}`)    as HTMLInputElement | null;
      const passwordEl = document.getElementById(`password-${role}`) as HTMLInputElement | null;
      const creds = DEMO_CREDS[role as typeof LOGIN_ROLES[number]];
      const email      = emailEl?.value    || creds?.email    || "";
      const password   = passwordEl?.value || creds?.password || "";
      await login(email, password);
    } catch (err) {
      toast({ title: "Sign in failed", description: err instanceof Error ? err.message : "Invalid credentials.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  /* ── email/password sign-up ── */
  const handleSignUp = async (role: Role) => {
    if (!termsAccepted) {
      toast({ title: "Terms required", description: "Please agree to the Terms and Conditions before signing up.", variant: "destructive" });
      return;
    }
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

  /* ── Facebook OAuth ── */
  const handleFacebookLogin = (role: Role) => {
    if (!FACEBOOK_APP_ID || FACEBOOK_APP_ID === "placeholder") return;
    setIsLoading(true);
    const doLogin = () => {
      window.FB!.login((response) => {
        if (!response.authResponse?.accessToken) {
          setIsLoading(false);
          toast({ title: "Facebook sign-in cancelled", description: "The sign-in window was closed.", variant: "destructive" });
          return;
        }
        fetch("/api/auth/facebook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken: response.authResponse.accessToken, role }),
        })
          .then(async (res) => {
            if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error((d as { error?: string }).error || "Facebook sign-in failed"); }
            const { token, user: fbUser } = await res.json() as { token: string; user: { email: string } };
            await login(fbUser.email, "", token);
          })
          .catch((err) => toast({ title: "Facebook sign-in failed", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" }))
          .finally(() => setIsLoading(false));
      }, { scope: "public_profile,email" });
    };

    if (window.FB) { doLogin(); return; }
    window.fbAsyncInit = () => {
      window.FB!.init({ appId: FACEBOOK_APP_ID, cookie: true, xfbml: false, version: "v19.0" });
      doLogin();
    };
    if (!document.getElementById("facebook-jssdk")) {
      const s = document.createElement("script");
      s.id = "facebook-jssdk";
      s.src = "https://connect.facebook.net/en_US/sdk.js";
      document.head.appendChild(s);
    }
  };

  /* ── LinkedIn OAuth (popup flow) ── */
  const handleLinkedInLogin = (role: Role) => {
    if (!LINKEDIN_CLIENT_ID || LINKEDIN_CLIENT_ID === "placeholder") return;
    const redirectUri = encodeURIComponent(`${window.location.origin}/api/auth/linkedin/callback`);
    const scope = encodeURIComponent("openid profile email");
    const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${redirectUri}&scope=${scope}&state=${role}`;

    linkedinPopup.current?.close();
    linkedinPopup.current = window.open(url, "linkedin_login", "width=600,height=700,left=200,top=100");
    setIsLoading(true);

    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "linkedin_success") {
        window.removeEventListener("message", onMessage);
        const { token, user: liUser } = e.data as { token: string; user: { email: string } };
        login(liUser.email, "", token)
          .catch((err) => toast({ title: "LinkedIn sign-in failed", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" }))
          .finally(() => setIsLoading(false));
      } else if (e.data?.type === "linkedin_error") {
        window.removeEventListener("message", onMessage);
        setIsLoading(false);
        toast({ title: "LinkedIn sign-in failed", description: e.data.error || "Please try again.", variant: "destructive" });
      }
    };
    window.addEventListener("message", onMessage);
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

  const googleConfigured   = Boolean(GOOGLE_CLIENT_ID   && GOOGLE_CLIENT_ID   !== "placeholder");
  const facebookConfigured = Boolean(FACEBOOK_APP_ID    && FACEBOOK_APP_ID    !== "placeholder");
  const linkedinConfigured = Boolean(LINKEDIN_CLIENT_ID && LINKEDIN_CLIENT_ID !== "placeholder");

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
              <Tabs key={isSignUp ? "signup" : "login"} defaultValue="owner" className="w-full">
                <TabsList className={`grid w-full mb-8 ${isSignUp ? "grid-cols-4" : "grid-cols-3"}`}>
                  {(isSignUp ? SIGNUP_ROLES : LOGIN_ROLES).map((role) => (
                    <TabsTrigger key={role} value={role} className="text-xs px-1">
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {(isSignUp ? SIGNUP_ROLES : LOGIN_ROLES).map((role) => (
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
                          defaultValue={isSignUp ? "" : (DEMO_CREDS[role as typeof LOGIN_ROLES[number]]?.email ?? "")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`password-${role}`}>Password</Label>
                        <Input
                          id={`password-${role}`}
                          type="password"
                          defaultValue={isSignUp ? "" : (DEMO_CREDS[role as typeof LOGIN_ROLES[number]]?.password ?? "")}
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

                      {/* ── Social Sign-In ── */}
                      {(googleConfigured || facebookConfigured || linkedinConfigured) && (
                        <>
                          <div className="relative my-4">
                            <div className="absolute inset-0 flex items-center">
                              <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                              <span className="bg-white px-2 text-muted-foreground">Or continue with</span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            {googleConfigured && (
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
                            )}
                            {facebookConfigured && (
                              <button
                                type="button"
                                onClick={() => handleFacebookLogin(role)}
                                disabled={isLoading}
                                className="flex items-center justify-center gap-3 w-full h-10 rounded border border-gray-300 bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 disabled:opacity-50"
                              >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
                                  <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
                                </svg>
                                Continue with Facebook
                              </button>
                            )}
                            {linkedinConfigured && (
                              <button
                                type="button"
                                onClick={() => handleLinkedInLogin(role)}
                                disabled={isLoading}
                                className="flex items-center justify-center gap-3 w-full h-10 rounded border border-gray-300 bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 disabled:opacity-50"
                              >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="#0A66C2">
                                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                </svg>
                                Continue with LinkedIn
                              </button>
                            )}
                          </div>
                        </>
                      )}

                      {isSignUp && (
                        <div className={`flex items-start space-x-2 mt-4 pt-2 rounded-md p-2 transition-colors ${!termsAccepted ? "bg-transparent" : ""}`}>
                          <Checkbox
                            id={`terms-${role}`}
                            className="mt-1"
                            checked={termsAccepted}
                            onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                          />
                          <label htmlFor={`terms-${role}`} className="text-sm text-gray-500 leading-tight cursor-pointer select-none">
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
                          {DEMO_CREDS[role as typeof LOGIN_ROLES[number]] && (
                            <div className="text-center text-xs text-muted-foreground mt-4 bg-gray-100 p-2 rounded">
                              <span className="font-semibold">Demo Creds:</span> {DEMO_CREDS[role as typeof LOGIN_ROLES[number]].email} / {DEMO_CREDS[role as typeof LOGIN_ROLES[number]].password}
                            </div>
                          )}
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
                onClick={() => { setIsSignUp(!isSignUp); setTermsAccepted(false); }}
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
