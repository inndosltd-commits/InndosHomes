import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useLocation, Link } from "wouter";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Phone } from "lucide-react";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";

const LOGIN_ROLES  = ["owner", "host", "tenant"] as const;
const SIGNUP_ROLES = ["owner", "host", "tenant"] as const;
type Role = "owner" | "host" | "tenant";
const ROLE_LABELS: Record<Role, string> = { owner: "Owner", host: "Host/Agency", tenant: "Tenant" };


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
  const [forgotEmailSent, setForgotEmailSent] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [resetToken, setResetToken]           = useState<string | null>(null);
  const [showPasswords, setShowPasswords]     = useState<Record<string, boolean>>({});
  const toggleShowPassword = (key: string) => setShowPasswords(p => ({ ...p, [key]: !p[key] }));
  const [termsAccepted, setTermsAccepted]   = useState(false);
  const { login, signup, user, token: authToken } = useAuth();
  const { toast } = useToast();
  const linkedinPopup = useRef<Window | null>(null);

  const [otpSent, setOtpSent]           = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneToken, setPhoneToken]       = useState<string | null>(null);
  const [isSendingOtp, setIsSendingOtp]   = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // Google new-user phone verification
  const [pendingGoogleToken, setPendingGoogleToken] = useState<string | null>(null);
  const [pendingGoogleEmail, setPendingGoogleEmail] = useState("");
  const [showGooglePhoneModal, setShowGooglePhoneModal] = useState(false);
  const [gPhone, setGPhone] = useState("");
  const [gOtpSent, setGOtpSent] = useState(false);
  const [gOtpCode, setGOtpCode] = useState("");
  const [isGPhoneLoading, setIsGPhoneLoading] = useState(false);

  // Firm/agency registration state (host tab only)
  const [isRegisteredFirm, setIsRegisteredFirm] = useState(false);
  const [firmType, setFirmType] = useState<"business_name" | "registered_company">("business_name");

  const resetOtpState = () => { setOtpSent(false); setPhoneVerified(false); setPhoneToken(null); };

  // Capture referral code from URL (?ref=CODE) and persist across page loads
  const [referralCode, setReferralCode] = useState<string | null>(() => {
    return sessionStorage.getItem("inndos_ref") ?? null;
  });

  useEffect(() => {
    const hash = window.location.hash;
    const resetMatch = hash.match(/reset-password\?token=([^&]+)/);
    if (resetMatch) {
      setResetToken(decodeURIComponent(resetMatch[1]));
      setIsResetPassword(true);
      return;
    }
    const isSignupUrl = window.location.search.includes("signup=true") || hash.includes("signup=true");
    setIsSignUp(isSignupUrl);

    // Extract ?ref= from hash query string (e.g. /#/login?ref=JOHN1234)
    const hashQuery = hash.split("?")[1] ?? "";
    const ref = new URLSearchParams(hashQuery).get("ref");
    if (ref) {
      sessionStorage.setItem("inndos_ref", ref);
      setReferralCode(ref);
      // Track the visit so the marketer sees link-click analytics
      fetch("/api/marketing/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referralCode: ref, landingPage: window.location.href }),
      }).catch(() => {/* fire-and-forget */});
    }
  }, [location]);

  useEffect(() => { resetOtpState(); }, [isSignUp]);

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
      const email    = emailEl?.value    || "";
      const password = passwordEl?.value || "";
      await login(email, password);
    } catch (err) {
      toast({ title: "Sign in failed", description: err instanceof Error ? err.message : "Invalid credentials.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  /* ── OTP: send ── */
  const handleSendOtp = async (role: Role) => {
    const phoneEl = document.getElementById(`phone-${role}`) as HTMLInputElement | null;
    const phone = phoneEl?.value?.trim() || "";
    if (!phone) {
      toast({ title: "Phone required", description: "Please enter your phone number.", variant: "destructive" });
      return;
    }
    setIsSendingOtp(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || "Failed to send OTP");
      setOtpSent(true);
      toast({ title: "OTP sent", description: "Check your phone for the 6-digit code." });
    } catch (err) {
      toast({ title: "Failed to send OTP", description: err instanceof Error ? err.message : "Try again.", variant: "destructive" });
    } finally {
      setIsSendingOtp(false);
    }
  };

  /* ── OTP: verify ── */
  const handleVerifyOtp = async (role: Role) => {
    const phoneEl = document.getElementById(`phone-${role}`) as HTMLInputElement | null;
    const otpEl   = document.getElementById(`otp-${role}`)   as HTMLInputElement | null;
    const phone = phoneEl?.value?.trim() || "";
    const code  = otpEl?.value?.trim()   || "";
    if (!phone || !code) {
      toast({ title: "Missing fields", description: "Please enter your phone and OTP code.", variant: "destructive" });
      return;
    }
    setIsVerifyingOtp(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || "OTP verification failed");
      setPhoneToken((data as { phoneToken?: string }).phoneToken ?? null);
      setPhoneVerified(true);
      toast({ title: "Phone verified", description: "Your phone number has been verified." });
    } catch (err) {
      toast({ title: "Verification failed", description: err instanceof Error ? err.message : "Invalid code.", variant: "destructive" });
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  /* ── email/password sign-up ── */
  const handleSignUp = async (role: Role) => {
    if (!termsAccepted) {
      toast({ title: "Terms required", description: "Please agree to the Terms and Conditions before signing up.", variant: "destructive" });
      return;
    }
    if (!phoneVerified || !phoneToken) {
      toast({ title: "Phone verification required", description: "Please verify your phone number before creating an account.", variant: "destructive" });
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
      const extraOpts: Record<string, unknown> = { ...(role === "host" ? { isRegisteredFirm, firmType: isRegisteredFirm ? firmType : undefined } : {}) };
      if (referralCode) extraOpts.referralCode = referralCode;
      await signup(role, name, email, password, phoneToken, extraOpts as any);
      // clear referral code after successful signup
      sessionStorage.removeItem("inndos_ref");
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
      const { token, user: googleUser, isNewUser } = await res.json() as {
        token: string;
        user: { name: string; email: string; role: string };
        isNewUser: boolean;
      };
      if (isNewUser) {
        // New account — require phone verification before granting access
        setPendingGoogleToken(token);
        setPendingGoogleEmail(googleUser.email);
        setShowGooglePhoneModal(true);
      } else {
        await login(googleUser.email, "", token);
      }
    } catch (err) {
      toast({ title: "Google sign-in failed", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Google new-user phone OTP ── */
  const handleGoogleSendOtp = async () => {
    if (!gPhone.trim()) {
      toast({ title: "Phone required", description: "Please enter your phone number.", variant: "destructive" });
      return;
    }
    setIsGPhoneLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: gPhone.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || "Failed to send OTP");
      setGOtpSent(true);
      toast({ title: "OTP sent", description: "Check your phone for the 6-digit code." });
    } catch (err) {
      toast({ title: "Failed to send OTP", description: err instanceof Error ? err.message : "Try again.", variant: "destructive" });
    } finally {
      setIsGPhoneLoading(false);
    }
  };

  const handleGoogleVerifyAndLogin = async () => {
    if (!gOtpCode.trim() || !gPhone.trim()) {
      toast({ title: "Missing fields", description: "Enter your phone and OTP code.", variant: "destructive" });
      return;
    }
    setIsGPhoneLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: gPhone.trim(), code: gOtpCode.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || "OTP verification failed");
      // Optionally save phone to profile (best-effort)
      if (pendingGoogleToken) {
        await fetch("/api/auth/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${pendingGoogleToken}` },
          body: JSON.stringify({ phone: gPhone.trim(), phoneVerified: true }),
        }).catch(() => {});
        await login(pendingGoogleEmail, "", pendingGoogleToken);
      }
      setShowGooglePhoneModal(false);
    } catch (err) {
      toast({ title: "Verification failed", description: err instanceof Error ? err.message : "Invalid code.", variant: "destructive" });
    } finally {
      setIsGPhoneLoading(false);
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

  /* ── forgot password ── */
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailEl = document.getElementById("reset-email") as HTMLInputElement | null;
    const email = emailEl?.value?.trim();
    if (!email) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setForgotEmailSent(true);
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  /* ── reset password (from email link) ── */
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const newPwEl   = document.getElementById("new-password")    as HTMLInputElement | null;
    const confirmEl = document.getElementById("confirm-password") as HTMLInputElement | null;
    const newPw = newPwEl?.value ?? "";
    const confirm = confirmEl?.value ?? "";
    if (newPw.length < 6) {
      toast({ title: "Too short", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (newPw !== confirm) {
      toast({ title: "Passwords don't match", description: "Please make sure both passwords are the same.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, password: newPw }),
      });
      const data = await res.json() as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) throw new Error(data.error ?? "Reset failed");
      toast({ title: "Password updated!", description: "You can now sign in with your new password." });
      setIsResetPassword(false);
      setResetToken(null);
      window.location.hash = "/login";
    } catch (err) {
      toast({ title: "Reset failed", description: err instanceof Error ? err.message : "Try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
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
              {isResetPassword ? "Set New Password" : isForgotPassword ? "Reset Password" : (isSignUp ? "Create an Account" : "Welcome Back")}
            </CardTitle>
            <CardDescription>
              {isResetPassword
                ? "Enter your new password below."
                : isForgotPassword
                  ? "Enter your email and we'll send reset instructions."
                  : (isSignUp ? "Sign up to join the inndos community" : "Sign in to access your inndos dashboard")}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isResetPassword ? (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input id="new-password" type={showPasswords["new-pw"] ? "text" : "password"} placeholder="At least 6 characters" required minLength={6} className="pr-10" />
                    <button type="button" tabIndex={-1} onClick={() => toggleShowPassword("new-pw")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPasswords["new-pw"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Input id="confirm-password" type={showPasswords["confirm-pw"] ? "text" : "password"} placeholder="Repeat new password" required className="pr-10" />
                    <button type="button" tabIndex={-1} onClick={() => toggleShowPassword("confirm-pw")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPasswords["confirm-pw"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Saving..." : "Save New Password"}
                </Button>
              </form>
            ) : isForgotPassword ? (
              forgotEmailSent ? (
                <div className="text-center space-y-4 py-2">
                  <div className="text-4xl">📬</div>
                  <p className="text-sm text-gray-700 font-medium">Check your email</p>
                  <p className="text-sm text-gray-500">We sent a password reset link to your inbox. It expires in 1 hour.</p>
                  <Button variant="link" className="text-sm" onClick={() => { setIsForgotPassword(false); setForgotEmailSent(false); }}>
                    Back to sign in
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email Address</Label>
                    <Input id="reset-email" type="email" placeholder="name@example.com" required />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Sending..." : "Send Reset Link"}
                  </Button>
                  <div className="text-center mt-4">
                    <Button variant="link" onClick={() => setIsForgotPassword(false)} className="text-sm">
                      Back to sign in
                    </Button>
                  </div>
                </form>
              )
            ) : (
              <Tabs key={isSignUp ? "signup" : "login"} defaultValue="owner" className="w-full">
                <TabsList className={`grid w-full mb-8 ${isSignUp ? "grid-cols-3" : "grid-cols-3"}`}>
                  {(isSignUp ? SIGNUP_ROLES : LOGIN_ROLES).map((role) => (
                    <TabsTrigger key={role} value={role} className="text-xs px-1">
                      {ROLE_LABELS[role]}
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
                      {isSignUp && (
                        <div className="space-y-2">
                          <Label htmlFor={`phone-${role}`}>Phone Number</Label>
                          <div className="flex gap-2">
                            <Input
                              id={`phone-${role}`}
                              type="tel"
                              placeholder="07XXXXXXXX or +254XXXXXXXXX"
                              disabled={phoneVerified}
                              className={phoneVerified ? "border-green-500 bg-green-50" : ""}
                            />
                            <button
                              type="button"
                              onClick={() => handleSendOtp(role)}
                              disabled={isSendingOtp || phoneVerified}
                              className="shrink-0 px-3 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors whitespace-nowrap"
                            >
                              {isSendingOtp ? "Sending…" : otpSent && !phoneVerified ? "Resend" : "Send OTP"}
                            </button>
                          </div>
                          {phoneVerified && (
                            <p className="text-sm text-green-600 flex items-center gap-1 font-medium">
                              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                              Phone verified
                            </p>
                          )}
                        </div>
                      )}
                      {isSignUp && otpSent && !phoneVerified && (
                        <div className="space-y-2">
                          <Label htmlFor={`otp-${role}`}>Verification Code</Label>
                          <div className="flex gap-2">
                            <Input
                              id={`otp-${role}`}
                              placeholder="Enter 6-digit code"
                              maxLength={6}
                              inputMode="numeric"
                              pattern="[0-9]*"
                            />
                            <button
                              type="button"
                              onClick={() => handleVerifyOtp(role)}
                              disabled={isVerifyingOtp}
                              className="shrink-0 px-3 py-2 text-sm font-medium rounded-md bg-black text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors whitespace-nowrap"
                            >
                              {isVerifyingOtp ? "Verifying…" : "Verify"}
                            </button>
                          </div>
                          <p className="text-xs text-gray-400">Enter the code sent to your phone. Valid for 10 minutes.</p>
                        </div>
                      )}

                      {/* Firm/Agency section — host only, signup only */}
                      {isSignUp && role === "host" && (
                        <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-4 space-y-3">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              id="is-registered-firm"
                              checked={isRegisteredFirm}
                              onCheckedChange={(v) => setIsRegisteredFirm(v === true)}
                              className="mt-0.5"
                            />
                            <div>
                              <label htmlFor="is-registered-firm" className="text-sm font-semibold text-gray-800 cursor-pointer select-none">
                                I am registering as a registered firm / agency
                              </label>
                              <p className="text-xs text-gray-500 mt-0.5">
                                Companies and business-name holders upload business documents instead of a National ID for verification.
                              </p>
                            </div>
                          </div>

                          {isRegisteredFirm && (
                            <div className="space-y-2 pl-7">
                              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Firm type</p>
                              <div className="flex flex-col gap-2">
                                <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${firmType === "business_name" ? "border-blue-500 bg-white" : "border-gray-200 bg-white/60 hover:bg-white"}`}>
                                  <input
                                    type="radio"
                                    name="firmType"
                                    value="business_name"
                                    checked={firmType === "business_name"}
                                    onChange={() => setFirmType("business_name")}
                                    className="mt-0.5 accent-blue-600"
                                  />
                                  <div>
                                    <span className="text-sm font-medium text-gray-800">Business Name</span>
                                    <p className="text-xs text-gray-500">Sole proprietor / partnership registered under a business name</p>
                                    <p className="text-xs text-blue-600 mt-0.5">📄 Required: Certificate of Registration</p>
                                  </div>
                                </label>
                                <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${firmType === "registered_company" ? "border-blue-500 bg-white" : "border-gray-200 bg-white/60 hover:bg-white"}`}>
                                  <input
                                    type="radio"
                                    name="firmType"
                                    value="registered_company"
                                    checked={firmType === "registered_company"}
                                    onChange={() => setFirmType("registered_company")}
                                    className="mt-0.5 accent-blue-600"
                                  />
                                  <div>
                                    <span className="text-sm font-medium text-gray-800">Registered Company</span>
                                    <p className="text-xs text-gray-500">Limited company (Ltd/PLC) incorporated with the Registrar</p>
                                    <p className="text-xs text-blue-600 mt-0.5">📄 Required: Certificate of Incorporation + CR12 + Director IDs</p>
                                  </div>
                                </label>
                              </div>
                              <p className="text-xs text-gray-400 pt-1">You will upload these documents after creating your account under <strong>My Account → Verification</strong>.</p>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor={`email-${role}`}>Email</Label>
                        <Input
                          id={`email-${role}`}
                          type="email"
                          placeholder="Enter your email"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`password-${role}`}>Password</Label>
                        <div className="relative">
                          <Input
                            id={`password-${role}`}
                            type={showPasswords[`pw-${role}`] ? "text" : "password"}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => toggleShowPassword(`pw-${role}`)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showPasswords[`pw-${role}`] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <Button
                        className="w-full"
                        onClick={() => isSignUp ? handleSignUp(role) : handleLogin(role)}
                        disabled={isLoading}
                      >
                        {isLoading
                          ? (isSignUp ? "Signing up..." : "Signing in...")
                          : (isSignUp
                            ? `Sign up as ${ROLE_LABELS[role]}`
                            : `Sign in as ${ROLE_LABELS[role]}`)}
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
                onClick={() => {
                  const next = !isSignUp;
                  setIsSignUp(next);
                  setTermsAccepted(false);
                  window.location.hash = next ? "/login?signup=true" : "/login";
                }}
              >
                {isSignUp ? "Sign in" : "Sign up"}
              </span>
            </p>
          </CardFooter>
        </Card>
      </div>
      {/* ── Google new-user phone verification dialog ── */}
      <Dialog open={showGooglePhoneModal} onOpenChange={(open) => { if (!open) { setShowGooglePhoneModal(false); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" /> Verify Your Phone Number
            </DialogTitle>
            <DialogDescription>
              Your account was created with Google. Please verify your phone number to complete sign-up — just like other inndos users.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <div className="flex gap-2">
                <Input
                  type="tel"
                  placeholder="07XXXXXXXX or +254XXXXXXXXX"
                  value={gPhone}
                  onChange={(e) => setGPhone(e.target.value)}
                  disabled={gOtpSent || isGPhoneLoading}
                />
                <button
                  type="button"
                  onClick={handleGoogleSendOtp}
                  disabled={isGPhoneLoading || gOtpSent}
                  className="shrink-0 px-3 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  {isGPhoneLoading && !gOtpSent ? "Sending…" : gOtpSent ? "Sent ✓" : "Send OTP"}
                </button>
              </div>
            </div>
            {gOtpSent && (
              <div className="space-y-2">
                <Label>Verification Code</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="6-digit code"
                    maxLength={6}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={gOtpCode}
                    onChange={(e) => setGOtpCode(e.target.value)}
                    disabled={isGPhoneLoading}
                  />
                  <button
                    type="button"
                    onClick={handleGoogleVerifyAndLogin}
                    disabled={isGPhoneLoading || gOtpCode.length < 6}
                    className="shrink-0 px-3 py-2 text-sm font-medium rounded-md bg-black text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors whitespace-nowrap"
                  >
                    {isGPhoneLoading ? "Verifying…" : "Verify & Continue"}
                  </button>
                </div>
                <p className="text-xs text-gray-400">Code expires in 10 minutes.</p>
              </div>
            )}
          </div>
          <div className="flex justify-between items-center pt-2 border-t">
            <button
              type="button"
              className="text-xs text-gray-400 hover:text-gray-600 underline"
              onClick={async () => {
                // Allow skip but warn — complete login without phone
                if (pendingGoogleToken && pendingGoogleEmail) {
                  await login(pendingGoogleEmail, "", pendingGoogleToken);
                }
                setShowGooglePhoneModal(false);
              }}
            >
              Skip for now
            </button>
            {gOtpSent && (
              <button
                type="button"
                className="text-xs text-gray-400 hover:text-gray-600 underline"
                onClick={() => { setGOtpSent(false); setGOtpCode(""); setGPhone(""); }}
              >
                Change number
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
