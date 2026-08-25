import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Home, MessageSquare, Bell, Calendar, BarChart3, Heart, Clock, Plus, Users, FileText, AlertTriangle, DollarSign, Check, X, ExternalLink, Trash2, ArrowUpRight, ArrowDownRight, ShieldCheck, Eye, Edit, Star, Bookmark, UploadCloud, Lock, UserCircle, Loader2, Crown, Zap, Gift, Settings, CreditCard, RefreshCw, Globe, Search, Building } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useEffect, useState, useCallback, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { useAuth, type User } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessagingSystem } from "@/components/dashboard/MessagingSystem";
import { PropertyCalendar } from "@/components/dashboard/PropertyCalendar";
import { TransactionConfirmations } from "@/components/dashboard/TransactionConfirmations";
import { AdminAnalyticsDashboard } from "@/components/dashboard/AdminAnalyticsDashboard";
import { NotificationTemplatesPanel } from "@/pages/AdminNotifications";
import { AdminMarketingDashboard } from "@/components/marketing/AdminMarketingDashboard";
import { MarketerDashboard } from "@/components/marketing/MarketerDashboard";
import { OwnerAnalytics } from "@/components/dashboard/OwnerAnalytics";
import { TenantAnalytics } from "@/components/dashboard/TenantAnalytics";
import { PropertyLikesPanel } from "@/components/dashboard/PropertyLikesPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/lib/language";
import { BrandWordmark } from "@/components/layout/BrandWordmark";

function IdSideUpload({
  label, hint, currentPath, isUploading, isVerifying, inputRef, onChange
}: {
  label: string; hint: string; currentPath: string | null | undefined;
  isUploading: boolean; isVerifying?: boolean; inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const imgSrc = currentPath?.startsWith("/objects/") ? `/api/storage${currentPath}` : currentPath ?? null;
  const busy = isUploading || isVerifying;
  return (
    <div className="flex flex-col gap-2 flex-1 min-w-0">
      <span className="text-sm font-medium">{label}</span>
      <div
        className={`border-2 border-dashed rounded-xl overflow-hidden transition-colors cursor-pointer
          ${imgSrc ? "border-gray-300 bg-gray-50" : "border-gray-300 bg-gray-50/50 hover:bg-gray-50"}`}
        style={{ minHeight: 160 }}
        onClick={() => !busy && inputRef.current?.click()}
      >
        {isUploading ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
            <p className="text-sm text-gray-500">Uploading…</p>
          </div>
        ) : isVerifying ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 px-4 text-center">
            <Loader2 className="h-8 w-8 text-gray-500 animate-spin" />
            <p className="text-sm text-gray-700 font-medium">Verifying ID with AI…</p>
            <p className="text-xs text-gray-500">Checking Kenyan ID format & name match</p>
          </div>
        ) : imgSrc ? (
          <div className="relative group">
            <img src={imgSrc} alt={label} className="w-full object-cover rounded-xl" style={{ maxHeight: 200 }} />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
              <span className="text-white text-xs font-medium">Click to replace</span>
            </div>
            <span className="absolute top-2 right-2 bg-gray-900 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-0.5">
              <Check className="h-2.5 w-2.5" /> Verified
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 gap-2 px-4 text-center">
            <UploadCloud className="h-8 w-8 text-gray-300" />
            <p className="text-sm font-medium text-gray-600">{hint}</p>
            <p className="text-xs text-muted-foreground">JPG or PNG · Kenyan National ID only · max. 10MB</p>
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={onChange} />
    </div>
  );
}

function getImageUrl(path: string | null | undefined): string {
  if (!path) return "/images/modern_apartment_exterior.png";
  if (path.startsWith("/objects/")) return `/api/storage${path}`;
  return path;
}

function ProfileCard({ user, token, refreshUser }: { user: User; token: string | null; refreshUser: () => Promise<void> }) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [profileName, setProfileName] = useState(user.name);
  const [profileBusinessName, setProfileBusinessName] = useState((user as any).businessName ?? "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  // Phone OTP state
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneOtpCode, setPhoneOtpCode] = useState("");
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [isSendingPhoneOtp, setIsSendingPhoneOtp] = useState(false);
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);

  const handleSendPhoneOtp = async () => {
    if (!phoneInput.trim()) {
      toast({ title: "Phone required", description: "Please enter your phone number.", variant: "destructive" });
      return;
    }
    setIsSendingPhoneOtp(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error || "Failed to send OTP");
      setPhoneOtpSent(true);
      toast({ title: "OTP sent", description: "Check your phone for the 6-digit code." });
    } catch (err) {
      toast({ title: "Failed to send OTP", description: err instanceof Error ? err.message : "Try again.", variant: "destructive" });
    } finally {
      setIsSendingPhoneOtp(false);
    }
  };

  const handleVerifyPhone = async () => {
    if (!phoneInput.trim() || !phoneOtpCode.trim()) {
      toast({ title: "Missing fields", description: "Enter your phone number and OTP code.", variant: "destructive" });
      return;
    }
    setIsVerifyingPhone(true);
    try {
      // Verify OTP — get a phoneToken
      const verRes = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneInput.trim(), code: phoneOtpCode.trim() }),
      });
      const verData = await verRes.json();
      if (!verRes.ok) throw new Error((verData as { error?: string }).error || "OTP verification failed");
      const phoneToken = (verData as { phoneToken?: string }).phoneToken;

      // Save phone to profile via phoneToken
      const saveRes = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ phoneToken }),
      });
      if (!saveRes.ok) {
        const saveErr = await saveRes.json().catch(() => ({}));
        throw new Error((saveErr as { error?: string }).error || "Failed to save phone");
      }
      await refreshUser();
      setPhoneInput("");
      setPhoneOtpCode("");
      setPhoneOtpSent(false);
      toast({ title: "Phone verified ✓", description: "Your phone number has been saved." });
    } catch (err) {
      toast({ title: "Verification failed", description: err instanceof Error ? err.message : "Try again.", variant: "destructive" });
    } finally {
      setIsVerifyingPhone(false);
    }
  };
  const [isUploadingIdFront, setIsUploadingIdFront] = useState(false);
  const [isUploadingIdBack, setIsUploadingIdBack] = useState(false);
  const [isVerifyingIdFront, setIsVerifyingIdFront] = useState(false);
  const [isVerifyingIdBack, setIsVerifyingIdBack] = useState(false);
  const [idFrontPath, setIdFrontPath] = useState<string | null>(user.idFront ?? null);
  const [idBackPath, setIdBackPath] = useState<string | null>(user.idBack ?? null);
  // Firm document state
  const [firmCertRegPath, setFirmCertRegPath] = useState<string | null>((user as any).firmCertRegistration ?? null);
  const [firmCertIncPath, setFirmCertIncPath] = useState<string | null>((user as any).firmCertIncorporation ?? null);
  const [firmCr12Path, setFirmCr12Path] = useState<string | null>((user as any).firmCr12 ?? null);
  const [firmDirectorIdPaths, setFirmDirectorIdPaths] = useState<string[]>((user as any).firmDirectorIds ?? []);
  const [isUploadingFirm, setIsUploadingFirm] = useState<Record<string, boolean>>({});
  // Business documents (owner / host / agent — optional)
  const [bizCertPath, setBizCertPath] = useState<string | null>((user as any).businessCertRegistration ?? null);
  const [bizPermitPath, setBizPermitPath] = useState<string | null>((user as any).businessPermit ?? null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const idFrontInputRef = useRef<HTMLInputElement>(null);
  const idBackInputRef = useRef<HTMLInputElement>(null);
  const firmCertRegInputRef = useRef<HTMLInputElement>(null);
  const firmCertIncInputRef = useRef<HTMLInputElement>(null);
  const firmCr12InputRef = useRef<HTMLInputElement>(null);
  const firmDirIdInputRef = useRef<HTMLInputElement>(null);
  const bizCertInputRef = useRef<HTMLInputElement>(null);
  const bizPermitInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File): Promise<string> => {
    const urlRes = await fetch("/api/storage/uploads/request-url", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
    });
    if (!urlRes.ok) throw new Error("Failed to get upload URL");
    const { uploadURL, objectPath } = await urlRes.json() as { uploadURL: string; objectPath: string };
    const putRes = await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
    if (!putRes.ok) throw new Error("Failed to upload file");
    return objectPath as string;
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAvatar(true);
    try {
      const objectPath = await uploadFile(file);
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ avatar: objectPath }),
      });
      if (!res.ok) throw new Error("Failed to save avatar");
      await refreshUser();
      toast({ title: "Profile picture updated" });
    } catch (err) {
      toast({ title: "Upload failed", description: err instanceof Error ? err.message : "Try again.", variant: "destructive" });
    } finally { setIsUploadingAvatar(false); e.target.value = ""; }
  };

  const makeIdHandler = (
    side: "idFront" | "idBack",
    setUploading: (v: boolean) => void,
    setVerifying: (v: boolean) => void,
    setPath: (v: string | null) => void,
    inputEl: React.RefObject<HTMLInputElement | null>
  ) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast({ title: "File too large", description: "Maximum 10 MB.", variant: "destructive" }); return; }
    setUploading(true);
    let objectPath: string;
    try {
      objectPath = await uploadFile(file);
    } catch (err) {
      toast({ title: "Upload failed", description: err instanceof Error ? err.message : "Try again.", variant: "destructive" });
      setUploading(false);
      if (inputEl.current) inputEl.current.value = "";
      return;
    }
    setUploading(false);

    setVerifying(true);
    try {
      let extractedName: string | undefined;

      // Only run AI verification on the front side
      if (side === "idFront") {
        const verifyController = new AbortController();
        const verifyTimer = setTimeout(() => verifyController.abort(), 45_000);
        let verifyRes: Response;
        try {
          verifyRes = await fetch("/api/auth/verify-id", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ objectPath }),
            signal: verifyController.signal,
          });
        } finally {
          clearTimeout(verifyTimer);
        }
        const verifyData = await verifyRes.json() as { ok: boolean; message: string; extractedName?: string };

        if (!verifyData.ok) {
          toast({
            title: "ID Not Verified",
            description: verifyData.message,
            variant: "destructive",
            duration: 8000,
          });
          setPath(null);
          if (inputEl.current) inputEl.current.value = "";
          return;
        }
        extractedName = verifyData.extractedName;
      }

      const saveRes = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ [side]: objectPath }),
      });
      if (!saveRes.ok) throw new Error("Failed to save document");
      setPath(objectPath);
      await refreshUser();
      toast({
        title: side === "idFront" ? "✓ ID Front Verified" : "✓ ID Back Saved",
        description: extractedName ? `Name matched: ${extractedName}` : "Document accepted.",
      });
    } catch (err) {
      const isAbort = err instanceof Error && err.name === "AbortError";
      toast({
        title: isAbort ? "Verification timed out" : "Verification failed",
        description: isAbort
          ? "The AI check took too long. Please try again with a clearer, well-lit photo."
          : err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
        duration: 8000,
      });
      setPath(null);
    } finally {
      setVerifying(false);
      if (inputEl.current) inputEl.current.value = "";
    }
  };

  // Firm document upload handler
  const handleFirmDocUpload = async (
    key: string,
    file: File,
    profileField: string,
    onDone: (path: string) => void,
    isArray?: boolean,
    currentArray?: string[],
  ) => {
    if (file.size > 20 * 1024 * 1024) { toast({ title: "File too large", description: "Maximum 20 MB.", variant: "destructive" }); return; }
    setIsUploadingFirm(p => ({ ...p, [key]: true }));
    try {
      const objectPath = await uploadFile(file);
      const body: Record<string, unknown> = isArray
        ? { [profileField]: [...(currentArray ?? []), objectPath] }
        : { [profileField]: objectPath };
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save document");
      onDone(objectPath);
      await refreshUser();
      toast({ title: "✓ Document uploaded", description: "Saved successfully." });
    } catch (err) {
      toast({ title: "Upload failed", description: err instanceof Error ? err.message : "Try again.", variant: "destructive" });
    } finally {
      setIsUploadingFirm(p => ({ ...p, [key]: false }));
    }
  };

  const removeFirmDirectorId = async (idx: number) => {
    const updated = firmDirectorIdPaths.filter((_, i) => i !== idx);
    await fetch("/api/auth/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ firmDirectorIds: updated }),
    });
    setFirmDirectorIdPaths(updated);
    await refreshUser();
    toast({ title: "Director ID removed" });
  };

  const avatarSrc = user.avatar?.startsWith("/objects/")
    ? `/api/storage${user.avatar}`
    : user.avatar ?? null;

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="border-b bg-gray-50/50 rounded-t-xl pb-4">
        <div className="flex items-center gap-2">
          <UserCircle className="w-5 h-5 text-gray-500" />
          <CardTitle className="text-lg">Personal Information</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-8 pt-6">
        {/* Profile Picture */}
        <div className="flex flex-col gap-2">
          <Label>Profile Picture (Strictly face photo)</Label>
          <div className="flex items-center gap-4">
            <div className="h-24 w-24 rounded-full bg-gray-50 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden shrink-0">
              {avatarSrc
                ? <img src={avatarSrc} alt="Profile" className="h-full w-full object-cover" key={avatarSrc} />
                : <UserCircle className="h-12 w-12 text-gray-400" />}
            </div>
            <div className="flex flex-col gap-1">
              <Button variant="outline" size="sm" className="gap-2" disabled={isUploadingAvatar}
                onClick={() => avatarInputRef.current?.click()}>
                {isUploadingAvatar
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</>
                  : <><UploadCloud className="h-4 w-4" /> Upload Picture</>}
              </Button>
              <p className="text-xs text-muted-foreground">JPG or PNG, max 5MB</p>
            </div>
            <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="profile-name">{t("dash.full_name")}</Label>
            <Input id="profile-name" value={profileName} onChange={e => setProfileName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-email">{t("dash.email_address")}</Label>
            <Input id="profile-email" defaultValue={user.email} readOnly className="bg-gray-50 cursor-not-allowed" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="profile-business-name" className="flex items-center gap-1.5">
              <Building className="h-3.5 w-3.5 text-gray-500" /> Business / Brand Name
            </Label>
            <Input
              id="profile-business-name"
              placeholder="e.g. Sunrise Realty"
              value={profileBusinessName}
              onChange={e => setProfileBusinessName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Shown to guests on your listings. Leave blank to use your personal name.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-phone">{t("dash.phone_number")}</Label>
            {user.phone ? (
              /* Phone already set — show readOnly with verified badge */
              <div className="relative">
                <Input id="profile-phone" value={user.phone} readOnly className="bg-gray-50 cursor-not-allowed pr-32" />
                {user.phoneVerified && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5">
                    <Check className="h-3 w-3" /> {t("dash.verified")}
                  </span>
                )}
              </div>
            ) : (
              /* Phone not set — show OTP verification flow */
              <div className="space-y-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-800 font-medium">Add and verify your phone number</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="07XXXXXXXX or +254XXXXXXXXX"
                    value={phoneInput}
                    onChange={e => setPhoneInput(e.target.value)}
                    disabled={phoneOtpSent}
                    className="bg-white text-sm"
                  />
                  {!phoneOtpSent ? (
                    <Button size="sm" variant="outline" onClick={handleSendPhoneOtp} disabled={isSendingPhoneOtp} className="shrink-0 whitespace-nowrap">
                      {isSendingPhoneOtp ? <Loader2 className="h-3 w-3 animate-spin" /> : "Send OTP"}
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => { setPhoneOtpSent(false); setPhoneOtpCode(""); }} className="shrink-0 text-xs text-gray-500">
                      Change
                    </Button>
                  )}
                </div>
                {phoneOtpSent && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter 6-digit OTP"
                      value={phoneOtpCode}
                      onChange={e => setPhoneOtpCode(e.target.value)}
                      maxLength={6}
                      className="bg-white text-sm tracking-widest"
                      onKeyDown={e => e.key === "Enter" && handleVerifyPhone()}
                    />
                    <Button size="sm" onClick={handleVerifyPhone} disabled={isVerifyingPhone || phoneOtpCode.length < 6} className="shrink-0 bg-gray-900 hover:bg-gray-800">
                      {isVerifyingPhone ? <Loader2 className="h-3 w-3 animate-spin" /> : "Verify"}
                    </Button>
                  </div>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">{user.phone ? t("dash.phone_desc") : "Your phone number is used to receive booking notifications via SMS."}</p>
          </div>
        </div>

        {/* Verification Documents */}
        {(user as any).isRegisteredFirm ? (
          /* ── Registered Firm / Agency verification ── */
          <div className="space-y-5">
            <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-100 rounded-lg">
              <ShieldCheck className="h-4 w-4 text-gray-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  Registered {(user as any).firmType === "registered_company" ? "Company" : "Business Name"} Verification
                </p>
                <p className="text-xs text-gray-600">Upload your business documents below. No National ID required.</p>
              </div>
            </div>

            {(user as any).firmType === "business_name" && (
              /* Business Name — Certificate of Registration */
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Certificate of Registration</Label>
                <p className="text-xs text-muted-foreground">Issued by the Registrar of Business Names (BN series)</p>
                <IdSideUpload
                  label="Certificate of Registration"
                  hint="Upload a clear scan or photo of your certificate"
                  currentPath={firmCertRegPath}
                  isUploading={!!isUploadingFirm["certReg"]}
                  inputRef={firmCertRegInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0]; if (!file) return;
                    handleFirmDocUpload("certReg", file, "firmCertRegistration", setFirmCertRegPath);
                    e.target.value = "";
                  }}
                />
              </div>
            )}

            {(user as any).firmType === "registered_company" && (
              <div className="space-y-5">
                {/* Certificate of Incorporation */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Certificate of Incorporation</Label>
                  <p className="text-xs text-muted-foreground">Issued by the Registrar of Companies (PVT/PLC series)</p>
                  <IdSideUpload
                    label="Certificate of Incorporation"
                    hint="Upload a clear scan or photo"
                    currentPath={firmCertIncPath}
                    isUploading={!!isUploadingFirm["certInc"]}
                    inputRef={firmCertIncInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0]; if (!file) return;
                      handleFirmDocUpload("certInc", file, "firmCertIncorporation", setFirmCertIncPath);
                      e.target.value = "";
                    }}
                  />
                </div>

                {/* CR12 */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">CR12 Certificate</Label>
                  <p className="text-xs text-muted-foreground">Official list of directors from the Registrar of Companies</p>
                  <IdSideUpload
                    label="CR12 Certificate"
                    hint="Upload a clear scan or photo"
                    currentPath={firmCr12Path}
                    isUploading={!!isUploadingFirm["cr12"]}
                    inputRef={firmCr12InputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0]; if (!file) return;
                      handleFirmDocUpload("cr12", file, "firmCr12", setFirmCr12Path);
                      e.target.value = "";
                    }}
                  />
                </div>

                {/* Director IDs */}
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-semibold">Director ID Documents</Label>
                    <p className="text-xs text-muted-foreground">Upload a National ID or Passport for each director listed in the CR12</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {firmDirectorIdPaths.map((path, idx) => (
                      <div key={idx} className="relative group border rounded-lg overflow-hidden bg-gray-50">
                        <img
                          src={path.startsWith("/objects/") ? `/api/storage${path}` : path}
                          alt={`Director ${idx + 1} ID`}
                          className="w-full h-32 object-cover"
                        />
                        <div className="px-2 py-1 text-xs font-medium text-gray-600 flex items-center justify-between">
                          <span>Director {idx + 1} ID</span>
                          <button
                            onClick={() => removeFirmDirectorId(idx)}
                            className="text-gray-500 hover:text-gray-700 text-xs font-semibold"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                    <div
                      className="border-2 border-dashed rounded-lg flex flex-col items-center justify-center h-32 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => firmDirIdInputRef.current?.click()}
                    >
                      {isUploadingFirm["dirId"] ? (
                        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                      ) : (
                        <>
                          <Plus className="h-6 w-6 text-gray-400 mb-1" />
                          <span className="text-xs text-gray-500">Add Director ID</span>
                        </>
                      )}
                    </div>
                  </div>
                  <input
                    ref={firmDirIdInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]; if (!file) return;
                      handleFirmDocUpload(
                        "dirId", file, "firmDirectorIds",
                        (path) => setFirmDirectorIdPaths(prev => [...prev, path]),
                        true, firmDirectorIdPaths,
                      );
                      e.target.value = "";
                    }}
                  />
                  {firmDirectorIdPaths.length === 0 && (
                    <p className="text-xs text-amber-600">⚠ Add at least one director ID matching the CR12</p>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── Individual — National ID ── */
          <div className="space-y-3">
            <div>
              <Label>{t("dash.national_id")}</Label>
              <p className="text-xs text-muted-foreground mt-0.5">{t("dash.id_desc")}</p>
            </div>
            <div className="flex gap-4 flex-col sm:flex-row">
              <IdSideUpload
                label={t("dash.front_side")}
                hint={t("dash.upload_front_hint")}
                currentPath={idFrontPath}
                isUploading={isUploadingIdFront}
                isVerifying={isVerifyingIdFront}
                inputRef={idFrontInputRef}
                onChange={makeIdHandler("idFront", setIsUploadingIdFront, setIsVerifyingIdFront, setIdFrontPath, idFrontInputRef)}
              />
              <IdSideUpload
                label={t("dash.back_side")}
                hint={t("dash.upload_back_hint")}
                currentPath={idBackPath}
                isUploading={isUploadingIdBack}
                isVerifying={isVerifyingIdBack}
                inputRef={idBackInputRef}
                onChange={makeIdHandler("idBack", setIsUploadingIdBack, setIsVerifyingIdBack, setIdBackPath, idBackInputRef)}
              />
            </div>
            {(idFrontPath && idBackPath) && (
              <p className="text-xs text-gray-700 flex items-center gap-1">
                <Check className="h-3 w-3" /> {t("dash.both_uploaded")}
              </p>
            )}
            {(idFrontPath && !idBackPath) && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                ⚠ {t("dash.upload_back_msg")}
              </p>
            )}
            {(!idFrontPath && idBackPath) && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                ⚠ {t("dash.upload_front_msg")}
              </p>
            )}
          </div>
        )}

        {/* ── Business Documents — owners, hosts, agents (optional) ── */}
        {(user.role === "owner" || user.role === "host") && (
          <div className="space-y-4 rounded-xl border border-emerald-100 bg-emerald-50/40 p-5">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-emerald-900">Business Documents <span className="font-normal text-emerald-600 text-xs">(Optional)</span></p>
                <p className="text-xs text-emerald-700 mt-0.5">Upload your business registration certificate and/or business permit to build trust with guests and tenants. These can be added or updated at any time.</p>
              </div>
            </div>

            {/* Certificate of Business Registration */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Certificate of Business Registration</Label>
              <p className="text-xs text-muted-foreground">Certificate issued by the Registrar of Business Names or Registrar of Companies</p>
              <div
                className={`flex items-center gap-4 p-3 rounded-lg border-2 border-dashed cursor-pointer transition-colors
                  ${bizCertPath ? "border-emerald-300 bg-white" : "border-gray-200 bg-white hover:bg-gray-50"}`}
                onClick={() => !isUploadingFirm["bizCert"] && bizCertInputRef.current?.click()}
              >
                {bizCertPath ? (
                  <>
                    <div className="h-14 w-14 rounded-md overflow-hidden shrink-0 border border-emerald-200">
                      <img
                        src={bizCertPath.startsWith("/objects/") ? `/api/storage${bizCertPath}` : bizCertPath}
                        alt="Certificate"
                        className="h-full w-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-emerald-700 flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Certificate uploaded</p>
                      <p className="text-xs text-muted-foreground truncate">{bizCertPath.split("/").pop()}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs text-gray-500 shrink-0" onClick={e => { e.stopPropagation(); bizCertInputRef.current?.click(); }}>Replace</Button>
                  </>
                ) : isUploadingFirm["bizCert"] ? (
                  <div className="flex items-center gap-2 py-2 px-1 w-full justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                    <span className="text-sm text-emerald-700">Uploading…</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 py-2 px-1 w-full">
                    <UploadCloud className="h-8 w-8 text-gray-300 shrink-0" />
                    <div>
                      <p className="text-sm text-gray-600">Click to upload certificate</p>
                      <p className="text-xs text-muted-foreground">JPG, PNG, or PDF · max 20 MB</p>
                    </div>
                  </div>
                )}
              </div>
              <input
                ref={bizCertInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]; if (!file) return;
                  await handleFirmDocUpload("bizCert", file, "businessCertRegistration", setBizCertPath);
                  e.target.value = "";
                }}
              />
            </div>

            {/* Business Permit */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Business Permit <span className="text-xs text-muted-foreground font-normal">(Optional)</span></Label>
              <p className="text-xs text-muted-foreground">Annual county business permit / single business permit (SBP)</p>
              <div
                className={`flex items-center gap-4 p-3 rounded-lg border-2 border-dashed cursor-pointer transition-colors
                  ${bizPermitPath ? "border-emerald-300 bg-white" : "border-gray-200 bg-white hover:bg-gray-50"}`}
                onClick={() => !isUploadingFirm["bizPermit"] && bizPermitInputRef.current?.click()}
              >
                {bizPermitPath ? (
                  <>
                    <div className="h-14 w-14 rounded-md overflow-hidden shrink-0 border border-emerald-200">
                      <img
                        src={bizPermitPath.startsWith("/objects/") ? `/api/storage${bizPermitPath}` : bizPermitPath}
                        alt="Business Permit"
                        className="h-full w-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-emerald-700 flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Permit uploaded</p>
                      <p className="text-xs text-muted-foreground truncate">{bizPermitPath.split("/").pop()}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs text-gray-500 shrink-0" onClick={e => { e.stopPropagation(); bizPermitInputRef.current?.click(); }}>Replace</Button>
                  </>
                ) : isUploadingFirm["bizPermit"] ? (
                  <div className="flex items-center gap-2 py-2 px-1 w-full justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                    <span className="text-sm text-emerald-700">Uploading…</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 py-2 px-1 w-full">
                    <UploadCloud className="h-8 w-8 text-gray-300 shrink-0" />
                    <div>
                      <p className="text-sm text-gray-600">Click to upload business permit</p>
                      <p className="text-xs text-muted-foreground">JPG, PNG, or PDF · max 20 MB</p>
                    </div>
                  </div>
                )}
              </div>
              <input
                ref={bizPermitInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]; if (!file) return;
                  await handleFirmDocUpload("bizPermit", file, "businessPermit", setBizPermitPath);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
        )}

        <Button
          className="w-full md:w-auto"
          disabled={isSavingProfile}
          onClick={async () => {
            setIsSavingProfile(true);
            try {
              const res = await fetch("/api/auth/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ name: profileName, businessName: profileBusinessName }),
              });
              if (!res.ok) throw new Error("Save failed");
              await refreshUser();
              toast({ title: "Profile updated", description: "Your details have been saved." });
            } catch {
              toast({ title: "Save failed", variant: "destructive" });
            } finally { setIsSavingProfile(false); }
          }}
        >
          {isSavingProfile ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />{t("dash.saving")}</> : t("dash.save_changes")}
        </Button>
      </CardContent>
    </Card>
  );
}

function resolvePropertyImageUrl(path: string | null | undefined): string {
  if (!path) return "/images/modern_apartment_exterior.png";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/objects/")) return `/api/storage${path}`;
  return path;
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user, token, isLoading, logout, refreshUser } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();

  // --- REAL-TIME STATE ---
  // Admin State
  const [moderationQueue, setModerationQueue] = useState<any[]>([]);
  const [reportedListings, setReportedListings] = useState<number[]>([]);
  const [usersCount, setUsersCount] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [totalBookings, setTotalBookings] = useState(0);
  const [totalProperties, setTotalProperties] = useState(0);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [isLoadingAdminUsers, setIsLoadingAdminUsers] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userStatusFilter, setUserStatusFilter] = useState("all");
  const [userLocationSearch, setUserLocationSearch] = useState("");
  const [selectedProfileUser, setSelectedProfileUser] = useState<any | null>(null);
  const [profileUserProperties, setProfileUserProperties] = useState<any[]>([]);
  const [loadingProfileUserProperties, setLoadingProfileUserProperties] = useState(false);
  const [userActionLoading, setUserActionLoading] = useState<Record<string, boolean>>({});
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [resetPasswordDialog, setResetPasswordDialog] = useState<{ userId: string; userName: string } | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [createUserDialog, setCreateUserDialog] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({ name: "", email: "", password: "", role: "tenant" });
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [bookingActionLoading, setBookingActionLoading] = useState<Record<string, boolean>>({});
  // Upgrade account dialog (tenant → owner/host)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [upgradeTargetRole, setUpgradeTargetRole] = useState<'owner' | 'host' | null>(null);
  const [isUpgradingRole, setIsUpgradingRole] = useState(false);
  const [isLoadingAdminStats, setIsLoadingAdminStats] = useState(false);
  const [isLoadingModeration, setIsLoadingModeration] = useState(false);
  const [adminProperties, setAdminProperties] = useState<any[]>([]);
  const [isLoadingAdminProperties, setIsLoadingAdminProperties] = useState(false);
  const [propSearch, setPropSearch] = useState("");
  const [propStatusFilter, setPropStatusFilter] = useState("all");
  const [propLocationSearch, setPropLocationSearch] = useState("");
  const [myPropSearch, setMyPropSearch] = useState("");
  const [myPropStatusFilter, setMyPropStatusFilter] = useState("all");
  const [adminPropertyActionLoading, setAdminPropertyActionLoading] = useState<Record<string, boolean>>({});
  const [flagDialogId, setFlagDialogId] = useState<string | null>(null);
  const [flagComment, setFlagComment] = useState("");
  const [isFlagging, setIsFlagging] = useState(false);

  const pendingUsers = adminUsers.filter((u: any) => u.status === "pending");

  // Owner State
  const [ownerProperties, setOwnerProperties] = useState<any[]>([]);
  const [isLoadingProperties, setIsLoadingProperties] = useState(false);

  const [deactivatedProperties, setDeactivatedProperties] = useState<string[]>([]);

  // Favorites & messages (for tenants/guests overview cards)
  const [favorites, setFavorites] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);

  // Property likes (for owners — who liked their listings and when)
  const [propertyLikes, setPropertyLikes] = useState<any[]>([]);
  const [isLoadingPropertyLikes, setIsLoadingPropertyLikes] = useState(false);

  // Bookings state (for tenants/guests)
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [reviewModal, setReviewModal] = useState<{ open: boolean; booking: any } | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewedBookingIds, setReviewedBookingIds] = useState<Set<string>>(new Set());

  // Received bookings state (for owners/hosts)
  const [receivedBookings, setReceivedBookings] = useState<any[]>([]);
  const [isLoadingReceivedBookings, setIsLoadingReceivedBookings] = useState(false);
  const [linkupsSearch, setLinkupsSearch] = useState("");

  // Unread booking notifications count (for owners/hosts)
  const [unreadBookingCount, setUnreadBookingCount] = useState(0);

  // Notifications inbox (for owners/hosts)
  const [ownerNotifications, setOwnerNotifications] = useState<any[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);

  // Keep pending properties from localStorage (local only, not yet persisted to API)
  const [pendingProperties] = useState<any[]>([]);

  // Real stats derived from actual received bookings
  const receivedBookingsCount = receivedBookings.length;
  const receivedRevenue = receivedBookings.filter((b: any) => b.status === 'confirmed').reduce((sum: number, b: any) => sum + Number(b.totalPrice || 0), 0);
  const today = new Date().toDateString();
  const todayCheckIns = receivedBookings.filter((b: any) => b.startDate && new Date(b.startDate).toDateString() === today);
  const nextCheckIn = receivedBookings
    .filter((b: any) => b.startDate && new Date(b.startDate) >= new Date())
    .sort((a: any, z: any) => new Date(a.startDate).getTime() - new Date(z.startDate).getTime())[0];

  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash;
    const query = hash.split("?")[1] ?? "";
    return new URLSearchParams(query).get("tab") || "overview";
  });

  // Subscription state
  const [subscription, setSubscription] = useState<{
    plan: string; status: string; billingCycle: string; billingMonths: number;
    amountPaid: number; startDate: string; endDate: string;
    listingCount: number; listingLimit: number;
  } | null>(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(false);
  const [featureLoading, setFeatureLoading] = useState<Record<string, boolean>>({});
  const [upgradeDialogPlan, setUpgradeDialogPlan] = useState<"basic" | "pro" | "enterprise" | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly" | "custom">("monthly");
  const [customMonths, setCustomMonths] = useState(3);
  const [isUpgrading, setIsUpgrading] = useState(false);

  // Marketer check — runs whenever user/token resolves; works for any role including admin
  const [isMarketer, setIsMarketer] = useState(false);
  useEffect(() => {
    if (!user || !token) return;
    fetch("/api/marketing/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (r.ok) setIsMarketer(true); else setIsMarketer(false); })
      .catch(() => {});
  }, [user, token]);

  // Admin reviews moderation state
  const [adminReviews, setAdminReviews] = useState<any[]>([]);
  const [isLoadingAdminReviews, setIsLoadingAdminReviews] = useState(false);
  const [adminReviewsSearch, setAdminReviewsSearch] = useState("");
  const [adminReviewsRatingFilter, setAdminReviewsRatingFilter] = useState<number | null>(null);

  // Admin subscription management state
  const [adminSubscriptions, setAdminSubscriptions] = useState<any[]>([]);
  const [isLoadingAdminSubs, setIsLoadingAdminSubs] = useState(false);
  const [subsSearch, setSubsSearch] = useState("");
  const [adminPayments, setAdminPayments] = useState<any[]>([]);
  const [isLoadingAdminPayments, setIsLoadingAdminPayments] = useState(false);
  const [assignSubDialog, setAssignSubDialog] = useState<{ userId: string; userName: string } | null>(null);
  const [calendarProperty, setCalendarProperty] = useState<{ id: string; title: string } | null>(null);
  const [assignPlan, setAssignPlan] = useState<"free" | "basic" | "pro" | "enterprise">("basic");
  const [assignMonths, setAssignMonths] = useState(1);
  const [isAssigning, setIsAssigning] = useState(false);

  // Admin plan management state
  const [adminPlans, setAdminPlans] = useState<any[]>([]);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [planForm, setPlanForm] = useState({ displayName: "", pricePerMonth: 0, listingLimit: 3, features: [] as string[], isActive: true });
  const [newFeature, setNewFeature] = useState("");
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [createPlanDialog, setCreatePlanDialog] = useState(false);
  const [createPlanForm, setCreatePlanForm] = useState({ name: "", displayName: "", pricePerMonth: 0, listingLimit: 3, features: [] as string[], isActive: true });
  const [createPlanFeature, setCreatePlanFeature] = useState("");
  const [deletingPlanName, setDeletingPlanName] = useState<string | null>(null);
  const [isDeletingPlan, setIsDeletingPlan] = useState(false);

  // Admin payment settings state
  const [paymentSettings, setPaymentSettings] = useState<{
    pesapalConsumerKey: string; pesapalConsumerSecret: string;
    pesapalMode: string; pesapalIpnId: string;
  } | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ pesapalConsumerKey: "", pesapalConsumerSecret: "", pesapalMode: "live" });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [smsSettings, setSmsSettings] = useState<{ senderId: string; provider: string; username: string; passwordSet: boolean; apiKeySet: boolean; configured: boolean } | null>(null);
  const [smsForm, setSmsForm] = useState({ provider: "airtouch", senderId: "", username: "", password: "", apiKey: "" });
  const [isLoadingSmsSettings, setIsLoadingSmsSettings] = useState(false);
  const [isSavingSmsSettings, setIsSavingSmsSettings] = useState(false);
  const [smsTestPhone, setSmsTestPhone] = useState("");
  const [isSendingTestSms, setIsSendingTestSms] = useState(false);
  const [isRegisteringIpn, setIsRegisteringIpn] = useState(false);

  const fetchAdminStats = useCallback(async () => {
    if (!user || !token || user.role !== 'admin') return;
    setIsLoadingAdminStats(true);
    try {
      const res = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsersCount(data.totalUsers);
        setRevenue(data.totalRevenue);
        setTotalBookings(data.totalBookings);
        setTotalProperties(data.totalProperties);
      } else {
        toast({ title: "Could not load admin stats", description: "Failed to fetch platform statistics.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", description: "Could not reach the server to load admin stats.", variant: "destructive" });
    } finally {
      setIsLoadingAdminStats(false);
    }
  }, [user, token, toast]);

  // Fetch properties for the user currently open in the View Profile modal
  useEffect(() => {
    if (!selectedProfileUser || !token) {
      setProfileUserProperties([]);
      return;
    }
    setLoadingProfileUserProperties(true);
    fetch(`/api/properties?ownerId=${selectedProfileUser.id}&limit=50`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then(d => setProfileUserProperties(Array.isArray(d) ? d : []))
      .catch(() => setProfileUserProperties([]))
      .finally(() => setLoadingProfileUserProperties(false));
  }, [selectedProfileUser?.id, token]);

  const fetchAdminUsers = useCallback(async () => {
    if (!user || !token || user.role !== 'admin') return;
    setIsLoadingAdminUsers(true);
    try {
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAdminUsers(data);
      } else {
        toast({ title: "Could not load users", description: "Failed to fetch user list.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", description: "Could not reach the server to load users.", variant: "destructive" });
    } finally {
      setIsLoadingAdminUsers(false);
    }
  }, [user, token, toast]);

  const fetchModerationQueue = useCallback(async () => {
    if (!user || !token || user.role !== 'admin') return;
    setIsLoadingModeration(true);
    try {
      const res = await fetch("/api/admin/moderation", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setModerationQueue(data);
      } else {
        toast({ title: "Could not load moderation queue", description: "Failed to fetch pending properties.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", description: "Could not reach the server to load the moderation queue.", variant: "destructive" });
    } finally {
      setIsLoadingModeration(false);
    }
  }, [user, token, toast]);

  const fetchAdminProperties = useCallback(async () => {
    if (!user || !token || user.role !== 'admin') return;
    setIsLoadingAdminProperties(true);
    try {
      const res = await fetch("/api/properties", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAdminProperties(data);
      } else {
        toast({ title: "Could not load properties", description: "Failed to fetch platform listings.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", description: "Could not reach the server to load properties.", variant: "destructive" });
    } finally {
      setIsLoadingAdminProperties(false);
    }
  }, [user, token, toast]);

  const fetchOwnerProperties = useCallback(async () => {
    if (!user || !token || (user.role !== 'owner' && user.role !== 'host')) return;
    setIsLoadingProperties(true);
    try {
      const res = await fetch(`/api/properties?ownerId=${encodeURIComponent(user.id)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOwnerProperties(data);
      } else {
        toast({ title: "Could not load listings", description: "Failed to fetch your properties. Please refresh.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", description: "Could not reach the server to load your listings.", variant: "destructive" });
    } finally {
      setIsLoadingProperties(false);
    }
  }, [user, token, toast]);

  const fetchFavoritesAndMessages = useCallback(async () => {
    if (!user || !token || (user.role !== 'tenant' && user.role !== 'guest')) return;
    try {
      const [favRes, msgRes] = await Promise.all([
        fetch("/api/favorites", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/messages", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (favRes.ok) setFavorites(await favRes.json());
      if (msgRes.ok) setMessages(await msgRes.json());
    } catch { /* silent — stats are non-critical */ }
  }, [user, token]);

  const unsaveFavorite = useCallback(async (propertyId: string) => {
    if (!token) return;
    // Optimistically remove from list
    setFavorites((prev: any[]) => prev.filter((p: any) => p.id !== propertyId));
    try {
      const res = await fetch(`/api/favorites/${propertyId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        // Revert on failure by re-fetching
        const favRes = await fetch("/api/favorites", { headers: { Authorization: `Bearer ${token}` } });
        if (favRes.ok) setFavorites(await favRes.json());
        toast({ title: "Failed to remove", description: "Could not remove the saved property. Please try again.", variant: "destructive" });
      }
    } catch {
      // Revert on network error
      const favRes = await fetch("/api/favorites", { headers: { Authorization: `Bearer ${token}` } });
      if (favRes.ok) setFavorites(await favRes.json());
      toast({ title: "Failed to remove", description: "Network error. Please try again.", variant: "destructive" });
    }
  }, [token, toast]);

  const fetchPropertyLikes = useCallback(async () => {
    if (!user || !token || (user.role !== 'owner' && user.role !== 'host')) return;
    setIsLoadingPropertyLikes(true);
    try {
      const res = await fetch("/api/favorites/my-properties", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setPropertyLikes(await res.json());
    } catch { /* silent */ }
    finally { setIsLoadingPropertyLikes(false); }
  }, [user, token]);

  const fetchBookings = useCallback(async () => {
    if (!user || !token) return;
    setIsLoadingBookings(true);
    try {
      const res = await fetch("/api/bookings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
        // Load which bookings already have a review
        const confirmedIds = (data as any[]).filter((b: any) => b.status === "confirmed").map((b: any) => b.id);
        if (confirmedIds.length > 0) {
          const checks = await Promise.all(
            confirmedIds.map((id: string) =>
              fetch(`/api/reviews/check/${id}`, { headers: { Authorization: `Bearer ${token}` } })
                .then(r => r.ok ? r.json() : null)
            )
          );
          const reviewed = new Set<string>();
          checks.forEach((c, i) => { if (c?.hasReviewed) reviewed.add(confirmedIds[i]); });
          setReviewedBookingIds(reviewed);
        }
      } else {
        toast({ title: "Could not load bookings", description: "Failed to fetch your bookings. Please refresh.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", description: "Could not reach the server to load your bookings.", variant: "destructive" });
    } finally {
      setIsLoadingBookings(false);
    }
  }, [user, token, toast]);

  const submitReview = async () => {
    if (!reviewModal || !token || reviewRating < 1) return;
    setIsSubmittingReview(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bookingId: reviewModal.booking.id, rating: reviewRating, comment: reviewComment.trim() || undefined }),
      });
      if (res.ok) {
        setReviewedBookingIds(prev => new Set([...prev, reviewModal.booking.id]));
        setReviewModal(null);
        toast({ title: "Review submitted", description: "Thank you for rating your stay!" });
        // Refresh admin state so review list and property ratings stay current
        fetchAdminReviews();
        fetchAdminProperties();
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Could not submit review", description: err.error ?? "Please try again.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", description: "Could not reach the server.", variant: "destructive" });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const fetchReceivedBookings = useCallback(async () => {
    if (!user || !token || (user.role !== 'owner' && user.role !== 'host')) return;
    setIsLoadingReceivedBookings(true);
    try {
      const res = await fetch("/api/bookings/received", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReceivedBookings(data);
      } else {
        toast({ title: "Could not load reservations", description: "Failed to fetch incoming bookings. Please refresh.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", description: "Could not reach the server to load reservations.", variant: "destructive" });
    } finally {
      setIsLoadingReceivedBookings(false);
    }
  }, [user, token, toast]);

  const fetchUnreadBookingCount = useCallback(async () => {
    if (!user || !token) return;
    try {
      const res = await fetch("/api/notifications/unread-count", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadBookingCount(data.count ?? 0);
      }
    } catch {
      // silent — badge is non-critical
    }
  }, [user, token]);

  const markNotificationsRead = useCallback(async () => {
    if (!user || !token) return;
    if (unreadBookingCount === 0) return;
    try {
      const res = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setUnreadBookingCount(0);
      }
    } catch {
      // non-critical UI operation; badge stays until next successful sync
    }
  }, [user, token, unreadBookingCount]);

  const fetchNotifications = useCallback(async () => {
    if (!user || !token || (user.role !== 'owner' && user.role !== 'host')) return;
    setIsLoadingNotifications(true);
    try {
      const res = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOwnerNotifications(data);
      }
    } catch {
      // non-critical
    } finally {
      setIsLoadingNotifications(false);
    }
  }, [user, token]);

  const markOneNotificationRead = useCallback(async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setOwnerNotifications(prev =>
          prev.map(n => n.id === id ? { ...n, isRead: true } : n)
        );
        setUnreadBookingCount(prev => Math.max(0, prev - 1));
      }
    } catch {
      // non-critical
    }
  }, [token]);

  const clearAllNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setOwnerNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadBookingCount(0);
      }
    } catch {
      // non-critical
    }
  }, [token]);

  const fetchAdminPlans = useCallback(async () => {
    if (!user || !token || user.role !== 'admin') return;
    try {
      const res = await fetch("/api/admin/plans", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setAdminPlans(await res.json());
    } catch { /* non-critical */ }
  }, [user, token]);

  const fetchAdminSubscriptions = useCallback(async () => {
    if (!user || !token || user.role !== 'admin') return;
    setIsLoadingAdminSubs(true);
    try {
      const res = await fetch("/api/admin/subscriptions", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setAdminSubscriptions(await res.json());
    } catch { /* non-critical */ } finally { setIsLoadingAdminSubs(false); }
  }, [user, token]);

  const fetchAdminReviews = useCallback(async () => {
    if (!user || !token || user.role !== 'admin') return;
    setIsLoadingAdminReviews(true);
    try {
      const res = await fetch("/api/reviews/admin", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setAdminReviews(data.reviews ?? []);
      }
    } catch { /* non-critical */ } finally { setIsLoadingAdminReviews(false); }
  }, [user, token]);

  const fetchAdminPayments = useCallback(async () => {
    if (!user || !token || user.role !== 'admin') return;
    setIsLoadingAdminPayments(true);
    try {
      const res = await fetch("/api/admin/payments", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setAdminPayments(await res.json());
    } catch { /* non-critical */ } finally { setIsLoadingAdminPayments(false); }
  }, [user, token]);

  const fetchPaymentSettings = useCallback(async () => {
    if (!user || !token || user.role !== 'admin') return;
    setIsLoadingSettings(true);
    try {
      const res = await fetch("/api/admin/settings", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setPaymentSettings(data);
        setSettingsForm({ pesapalConsumerKey: data.pesapalConsumerKey, pesapalConsumerSecret: "", pesapalMode: data.pesapalMode });
      }
    } catch { /* non-critical */ } finally { setIsLoadingSettings(false); }
  }, [user, token]);

  const fetchSmsSettings = useCallback(async () => {
    if (!user || !token || user.role !== 'admin') return;
    setIsLoadingSmsSettings(true);
    try {
      const res = await fetch("/api/admin/sms-settings", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setSmsSettings(data);
        setSmsForm(f => ({ ...f, provider: data.provider ?? "airtouch", senderId: data.senderId ?? "", username: data.username ?? "" }));
      }
    } catch { /* non-critical */ } finally { setIsLoadingSmsSettings(false); }
  }, [user, token]);

  const fetchSubscription = useCallback(async () => {
    if (!user || !token || (user.role !== 'owner' && user.role !== 'host')) return;
    setIsLoadingSubscription(true);
    try {
      const res = await fetch("/api/subscriptions/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSubscription(data);
      }
    } catch {
      // non-critical, subscription tab will show loading state
    } finally {
      setIsLoadingSubscription(false);
    }
  }, [user, token]);

  const handleSubscriptionUpgrade = async () => {
    if (!upgradeDialogPlan || !token) return;
    setIsUpgrading(true);
    try {
      const res = await fetch("/api/subscriptions/upgrade", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: upgradeDialogPlan,
          billingCycle,
          months: customMonths,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Upgrade failed", description: data.error || "Could not upgrade plan.", variant: "destructive" });
        return;
      }
      await fetchSubscription();
      setUpgradeDialogPlan(null);
      toast({
        title: "Plan Activated!",
        description: data.message || "Your subscription has been upgraded.",
        className: "bg-gray-50 border-gray-200 text-gray-800",
      });
    } catch {
      toast({ title: "Network error", description: "Could not reach the server.", variant: "destructive" });
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleDowngradeToFree = async () => {
    if (!token) return;
    setIsUpgrading(true);
    try {
      const res = await fetch("/api/subscriptions/upgrade", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "free" }),
      });
      if (res.ok) {
        await fetchSubscription();
        toast({ title: "Downgraded to Free", description: "Your plan has been set back to Free." });
      }
    } catch {
      toast({ title: "Network error", description: "Could not reach the server.", variant: "destructive" });
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleFeatureListing = async (property: any) => {
    if (!token) return;
    setFeatureLoading(prev => ({ ...prev, [property.id]: true }));
    try {
      const res = await fetch(`/api/properties/${property.id}/feature`, {
        method: property.isFeatured ? "DELETE" : "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Could not update featured listing", description: data.error ?? "Please review your plan allowance.", variant: "destructive" });
        return;
      }
      setOwnerProperties(prev => prev.map(p => p.id === property.id ? { ...p, ...data } : p));
      toast({ title: property.isFeatured ? "Removed from featured" : "Listing featured", description: property.isFeatured ? "This listing is no longer promoted." : "It will appear in Featured Listings through the end of this month." });
    } catch {
      toast({ title: "Network error", description: "Could not update this listing.", variant: "destructive" });
    } finally {
      setFeatureLoading(prev => ({ ...prev, [property.id]: false }));
    }
  };

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    if (tab === "reservations" || tab === "bookings") {
      markNotificationsRead();
    }
    if (tab === "notifications") {
      fetchNotifications();
    }
  }, [markNotificationsRead, fetchNotifications]);

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  useEffect(() => {
    if (user && token) {
      fetchOwnerProperties();
      fetchBookings();
      fetchReceivedBookings();
      fetchUnreadBookingCount();
      fetchSubscription();
      fetchFavoritesAndMessages();
      fetchPropertyLikes();
      if (user.role === 'admin') {
        fetchAdminStats();
        fetchModerationQueue();
        fetchAdminUsers();
        fetchAdminProperties();
        fetchAdminSubscriptions();
        fetchAdminPayments();
        fetchPaymentSettings();
        fetchAdminPlans();
        fetchSmsSettings();
        fetchAdminReviews();
      }
    }
  }, [user, token, fetchOwnerProperties, fetchBookings, fetchReceivedBookings, fetchUnreadBookingCount, fetchSubscription, fetchFavoritesAndMessages, fetchPropertyLikes, fetchAdminStats, fetchModerationQueue, fetchAdminUsers, fetchAdminProperties, fetchAdminSubscriptions, fetchAdminPayments, fetchPaymentSettings, fetchAdminPlans, fetchSmsSettings, fetchAdminReviews]);

  // Handle return from PesaPal payment
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("payment=")) return;
    const params = new URLSearchParams(hash.split("?")[1] ?? "");
    const paymentResult = params.get("payment");
    if (!paymentResult) return;

    // Clean up URL
    const cleanHash = hash.replace(/[?&]payment=[^&]*/, "");
    window.history.replaceState(null, "", window.location.pathname + cleanHash);

    if (paymentResult === "success") {
      fetchSubscription();
      setActiveTab("subscription");
      toast({
        title: "Payment successful!",
        description: "Your subscription has been activated. Thank you!",
        className: "bg-gray-50 border-gray-200 text-gray-800",
      });
    } else if (paymentResult === "failed") {
      toast({
        title: "Payment failed",
        description: "The payment was not completed. Please try again.",
        variant: "destructive",
      });
    } else if (paymentResult === "cancelled") {
      toast({ title: "Payment cancelled", description: "No charges were made." });
    } else if (paymentResult === "error") {
      toast({ title: "Payment error", description: "Something went wrong processing your payment.", variant: "destructive" });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- PROFILE COMPLETION REMINDER (every 3 days) ---
  useEffect(() => {
    if (!user) return;
    const isComplete = !!(user.phone && user.avatar && user.idFront);
    if (isComplete) return;
    const REMINDER_KEY = 'inndos_profile_reminder_ts';
    const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const last = localStorage.getItem(REMINDER_KEY);
    if (!last || now - Number(last) >= THREE_DAYS) {
      const t = setTimeout(() => {
        toast({
          title: "Complete your profile",
          description: "Your profile has missing details. Go to My Profile to add your phone number, photo, and ID documents — this builds trust with property owners.",
          duration: 12000,
        });
        localStorage.setItem(REMINDER_KEY, String(now));
      }, 2500);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // Handlers for interactions
  const handleApprove = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/properties/${id}/verify`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        toast({ title: "Approval failed", description: "Could not approve this property.", variant: "destructive" });
        return;
      }
      setModerationQueue(prev => prev.filter(item => item.id !== id));
      await fetchAdminStats();
      toast({
        title: "Listing Approved",
        description: "Property is now live on the platform.",
        className: "bg-gray-50 border-gray-200 text-gray-800",
      });
    } catch {
      toast({ title: "Network error", description: "Could not reach the server.", variant: "destructive" });
    }
  };

  const handleReject = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/properties/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        toast({ title: "Rejection failed", description: "Could not remove this property.", variant: "destructive" });
        return;
      }
      setModerationQueue(prev => prev.filter(item => item.id !== id));
      await fetchAdminStats();
      toast({
        title: "Listing Rejected",
        description: "Property has been removed.",
        variant: "destructive",
      });
    } catch {
      toast({ title: "Network error", description: "Could not reach the server.", variant: "destructive" });
    }
  };

  const handleFlag = async () => {
    if (!flagDialogId || !token || !flagComment.trim()) return;
    setIsFlagging(true);
    try {
      const res = await fetch(`/api/admin/properties/${flagDialogId}/flag`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ comment: flagComment.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({ title: "Flag failed", description: (data as { error?: string }).error || "Could not flag property.", variant: "destructive" });
        return;
      }
      setModerationQueue(prev => prev.filter(item => item.id !== flagDialogId));
      setFlagDialogId(null);
      setFlagComment("");
      await fetchAdminStats();
      toast({
        title: "Listing Flagged",
        description: "Owner has been notified with your feedback.",
        className: "bg-gray-50 border-gray-200 text-gray-800",
      });
    } catch {
      toast({ title: "Network error", description: "Could not reach the server.", variant: "destructive" });
    } finally {
      setIsFlagging(false);
    }
  };

  const handleOwnerResubmit = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/properties/${id}/resubmit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        toast({ title: "Resubmit failed", description: "Could not resubmit this property.", variant: "destructive" });
        return;
      }
      const updated = await res.json();
      setOwnerProperties(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));
      toast({
        title: "Resubmitted for Review",
        description: "Your listing has been sent back to admin for approval.",
        className: "bg-gray-50 border-gray-200 text-gray-800",
      });
    } catch {
      toast({ title: "Network error", description: "Could not reach the server.", variant: "destructive" });
    }
  };

  const handleResolveReport = (id: number) => {
    setReportedListings(prev => prev.filter(item => item !== id));
    toast({
      title: "Report Resolved",
      description: `Action taken on listing #${id}.`,
    });
  };

  const handleAdminDeleteProperty = async (id: string) => {
    if (!token) return;
    setAdminPropertyActionLoading(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/admin/properties/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        toast({ title: "Delete failed", description: "Could not delete this property.", variant: "destructive" });
        return;
      }
      setAdminProperties(prev => prev.filter(p => p.id !== id));
      await fetchAdminStats();
      toast({ title: "Property Deleted", description: "Listing permanently removed.", variant: "destructive" });
    } catch {
      toast({ title: "Network error", description: "Could not reach the server.", variant: "destructive" });
    } finally {
      setAdminPropertyActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleAdminToggleProperty = async (id: string) => {
    if (!token) return;
    setAdminPropertyActionLoading(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/admin/properties/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        toast({ title: "Update failed", description: "Could not update this property.", variant: "destructive" });
        return;
      }
      const updated = await res.json();
      setAdminProperties(prev => prev.map(p => p.id === id ? { ...p, isVerified: updated.isVerified } : p));
      toast({
        title: updated.isVerified ? "Property Activated" : "Property Deactivated",
        description: updated.isVerified ? "This listing is now live." : "This listing has been taken offline.",
      });
    } catch {
      toast({ title: "Network error", description: "Could not reach the server.", variant: "destructive" });
    } finally {
      setAdminPropertyActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleUserStatusUpdate = async (userId: string, newStatus: "active" | "suspended") => {
    if (!token) return;
    setUserActionLoading(prev => ({ ...prev, [userId]: true }));
    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({ title: "Action failed", description: (data as { error?: string }).error || "Could not update user status.", variant: "destructive" });
        return;
      }
      const updated = await res.json();
      setAdminUsers(prev => prev.map(u => u.id === userId ? { ...u, status: updated.status } : u));
      toast({
        title: newStatus === "suspended" ? "User suspended" : "User reactivated",
        description: newStatus === "suspended"
          ? `${updated.name} has been suspended.`
          : `${updated.name} is now active.`,
        className: newStatus === "active" ? "bg-green-50 border-green-200 text-green-800" : undefined,
        variant: newStatus === "suspended" ? "destructive" : undefined,
      });
    } catch {
      toast({ title: "Network error", description: "Could not reach the server.", variant: "destructive" });
    } finally {
      setUserActionLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleCreateUser = async () => {
    if (!token) return;
    const { name, email, password, role } = createUserForm;
    if (!name.trim() || !email.trim() || !password.trim()) {
      toast({ title: "All fields are required", variant: "destructive" }); return;
    }
    setIsCreatingUser(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password, role }),
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: "Failed to create user", description: (data as { error?: string }).error, variant: "destructive" }); return; }
      setAdminUsers(prev => [data, ...prev]);
      setCreateUserDialog(false);
      setCreateUserForm({ name: "", email: "", password: "", role: "tenant" });
      toast({ title: "User created", description: `${name} (${role}) has been added to the platform.`, className: "bg-gray-50 border-gray-200 text-gray-800" });
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleResetPassword = async () => {
    if (!token || !resetPasswordDialog) return;
    if (resetPasswordValue.length < 6) {
      toast({ title: "Password too short", description: "New password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    setResetPasswordLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${resetPasswordDialog.userId}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: resetPasswordValue }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Failed to reset password", description: err.error || "An error occurred.", variant: "destructive" });
        return;
      }
      toast({ title: "Password reset", description: `Password for ${resetPasswordDialog.userName} has been updated.`, className: "bg-gray-50 border-gray-200 text-gray-800" });
      setResetPasswordDialog(null);
      setResetPasswordValue("");
    } catch {
      toast({ title: "Network error", description: "Could not reach the server.", variant: "destructive" });
    } finally {
      setResetPasswordLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!token || !deleteUserId) return;
    setIsDeletingUser(true);
    try {
      const res = await fetch(`/api/admin/users/${deleteUserId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({ title: "Delete failed", description: (data as { error?: string }).error || "Could not delete user.", variant: "destructive" });
        return;
      }
      setAdminUsers(prev => prev.filter(u => u.id !== deleteUserId));
      toast({ title: "User deleted", description: "The user and all their data have been permanently removed." });
      setDeleteUserId(null);
    } catch {
      toast({ title: "Network error", description: "Could not reach the server.", variant: "destructive" });
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleDeleteProperty = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/properties/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({
          title: "Delete failed",
          description: (data as { error?: string }).error || "Could not delete property.",
          variant: "destructive",
        });
        return;
      }
      setOwnerProperties(prev => prev.filter(p => p.id !== id));
      toast({
        title: "Property Removed",
        description: "Listing deleted successfully.",
      });
    } catch {
      toast({ title: "Network error", description: "Could not reach the server.", variant: "destructive" });
    }
  };

  const handleTogglePropertyStatus = (id: string) => {
    setOwnerProperties(prev => prev.map(p => {
      if (p.id === id) {
        const newStatus = p.status === 'active' ? 'inactive' : 'active';
        toast({
          title: `Property ${newStatus === 'active' ? 'Activated' : 'Deactivated'}`,
          description: `The listing is now ${newStatus}.`,
        });
        return { ...p, status: newStatus };
      }
      return p;
    }));
  };

  const handleBookingStatusUpdate = async (bookingId: string, status: "confirmed" | "cancelled") => {
    if (!token) return;
    setBookingActionLoading(prev => ({ ...prev, [bookingId]: true }));
    try {
      const res = await fetch(`/api/bookings/${bookingId}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({ title: "Action failed", description: (data as { error?: string }).error || "Could not update booking status.", variant: "destructive" });
        return;
      }
      const updated = await res.json();
      setReceivedBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: updated.status } : b));
      toast({
        title: status === "confirmed" ? "Booking confirmed" : "Booking declined",
        description: status === "confirmed" ? "The guest has been confirmed." : "The booking has been declined.",
        className: status === "confirmed" ? "bg-green-50 border-green-200 text-green-800" : undefined,
        variant: status === "cancelled" ? "destructive" : undefined,
      });
    } catch {
      toast({ title: "Network error", description: "Could not reach the server.", variant: "destructive" });
    } finally {
      setBookingActionLoading(prev => ({ ...prev, [bookingId]: false }));
    }
  };

  // --- UPGRADE ROLE HANDLER ---
  const handleUpgradeRole = async () => {
    if (!upgradeTargetRole || !token) return;
    setIsUpgradingRole(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: upgradeTargetRole }),
      });
      if (!res.ok) throw new Error("Failed to upgrade account");
      await refreshUser();
      setShowUpgradeDialog(false);
      toast({ title: "Account upgraded!", description: `You are now a ${upgradeTargetRole === 'owner' ? 'Property Owner' : 'Host / Agency'}. You can now list your property.` });
      window.location.hash = "/add-listing";
    } catch {
      toast({ title: "Upgrade failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsUpgradingRole(false);
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="min-h-screen bg-gray-50 flex flex-col md:flex-row overflow-hidden w-full font-sans">
      {/* Upgrade Account Dialog — placed at Tabs root level so it's never unmounted */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Switch Account to List a Property</DialogTitle>
            <DialogDescription>
              Tenant accounts can't list properties. Choose the account type that fits you best — you can always manage everything from your dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            {/* Owner option */}
            <button
              onClick={() => setUpgradeTargetRole('owner')}
              className={`text-left rounded-xl border-2 p-4 transition-all ${upgradeTargetRole === 'owner' ? 'border-zinc-900 bg-zinc-50' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Home className="h-5 w-5 text-zinc-800" />
                <span className="font-semibold text-sm">Property Owner</span>
              </div>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>✓ List your own properties for rent or sale</li>
                <li>✓ Receive link-up requests from tenants</li>
                <li>✓ Manage bookings from your dashboard</li>
                <li>✓ Get SMS & email alerts on new link-ups</li>
              </ul>
            </button>
            {/* Host / Agency option */}
            <button
              onClick={() => setUpgradeTargetRole('host')}
              className={`text-left rounded-xl border-2 p-4 transition-all ${upgradeTargetRole === 'host' ? 'border-zinc-900 bg-zinc-50' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-zinc-800" />
                <span className="font-semibold text-sm">Host / Agency</span>
              </div>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>✓ List multiple properties on behalf of others</li>
                <li>✓ Register as a firm (business / company)</li>
                <li>✓ Access agency-level subscription plans</li>
                <li>✓ Manage all client listings in one dashboard</li>
              </ul>
            </button>
          </div>
          {upgradeTargetRole && (
            <p className="text-xs text-muted-foreground mt-1">
              You're switching to: <strong>{upgradeTargetRole === 'owner' ? 'Property Owner' : 'Host / Agency'}</strong>. This change takes effect immediately.
            </p>
          )}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)} disabled={isUpgradingRole}>Cancel</Button>
            <Button
              className="bg-zinc-900 hover:bg-zinc-800 text-white"
              disabled={!upgradeTargetRole || isUpgradingRole}
              onClick={handleUpgradeRole}
            >
              {isUpgradingRole ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Switching…</> : "Switch & List Property"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Mobile Header (Visible only on small screens) */}
      <div className="md:hidden bg-zinc-900 p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => { window.location.hash = "/"; }}>
          <BrandWordmark inverse />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-white/80 hover:text-white rounded-full"><Bell className="w-5 h-5" /></Button>
        </div>
      </div>
      
      {/* Mobile Tabs List (Horizontal scroll) */}
      <div className="md:hidden bg-zinc-800 shrink-0 border-b border-white/10">
        <TabsList className="flex w-full h-auto bg-transparent p-2 overflow-x-auto justify-start no-scrollbar gap-2">
          <TabsTrigger value="overview" className="whitespace-nowrap px-4 py-2 text-sm font-medium rounded-full text-gray-300 data-[state=active]:bg-white/20 data-[state=active]:text-white border-none shadow-none">
            {t("dash.dashboard")}
          </TabsTrigger>
          <TabsTrigger value="settings" className="whitespace-nowrap px-4 py-2 text-sm font-medium rounded-full text-gray-300 data-[state=active]:bg-white/20 data-[state=active]:text-white border-none shadow-none">
            {t("dash.profile")}
          </TabsTrigger>
          <TabsTrigger value="messages" className="whitespace-nowrap px-4 py-2 text-sm font-medium rounded-full text-gray-300 data-[state=active]:bg-white/20 data-[state=active]:text-white border-none shadow-none">
            {t("dash.messages")}
          </TabsTrigger>
          <TabsTrigger value="bookings" className="whitespace-nowrap px-4 py-2 text-sm font-medium rounded-full text-gray-300 data-[state=active]:bg-white/20 data-[state=active]:text-white border-none shadow-none">
            {t("dash.bookings")}
            {user.role !== 'owner' && user.role !== 'host' && user.role !== 'admin' && unreadBookingCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-gray-900 text-white text-[10px] font-bold leading-none">
                {unreadBookingCount > 99 ? "99+" : unreadBookingCount}
              </span>
            )}
          </TabsTrigger>
          {(user.role === 'tenant' || user.role === 'guest') && (
            <TabsTrigger value="saved" className="whitespace-nowrap px-4 py-2 text-sm font-medium rounded-full text-gray-300 data-[state=active]:bg-white/20 data-[state=active]:text-white border-none shadow-none">
              Saved
            </TabsTrigger>
          )}
          <TabsTrigger value="analytics" className="whitespace-nowrap px-4 py-2 text-sm font-medium rounded-full text-gray-300 data-[state=active]:bg-white/20 data-[state=active]:text-white border-none shadow-none">
            {t("dash.analytics")}
          </TabsTrigger>
          {(user.role === 'owner' || user.role === 'host') && (
            <TabsTrigger value="subscription" className="whitespace-nowrap px-4 py-2 text-sm font-medium rounded-full text-gray-300 data-[state=active]:bg-white/20 data-[state=active]:text-white border-none shadow-none">
              {t("dash.subscription")}
            </TabsTrigger>
          )}
          {(user.role === 'owner' || user.role === 'host') && (
            <TabsTrigger value="listings" className="whitespace-nowrap px-4 py-2 text-sm font-medium rounded-full text-gray-300 data-[state=active]:bg-white/20 data-[state=active]:text-white border-none shadow-none">
              {t("dash.listings_short")}
            </TabsTrigger>
          )}
          {(user.role === 'owner' || user.role === 'host') && (
            <TabsTrigger value="reservations" className="whitespace-nowrap px-4 py-2 text-sm font-medium rounded-full text-gray-300 data-[state=active]:bg-white/20 data-[state=active]:text-white border-none shadow-none">
              {t("dash.reservations")}
              {unreadBookingCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-gray-900 text-white text-[10px] font-bold leading-none">
                  {unreadBookingCount > 99 ? "99+" : unreadBookingCount}
                </span>
              )}
            </TabsTrigger>
          )}
          {(user.role === 'owner' || user.role === 'host') && (
            <TabsTrigger value="notifications" className="whitespace-nowrap px-4 py-2 text-sm font-medium rounded-full text-gray-300 data-[state=active]:bg-white/20 data-[state=active]:text-white border-none shadow-none">
              {t("dash.notifications")}
              {unreadBookingCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-gray-900 text-white text-[10px] font-bold leading-none">
                  {unreadBookingCount > 99 ? "99+" : unreadBookingCount}
                </span>
              )}
            </TabsTrigger>
          )}
          {(user.role === 'owner' || user.role === 'host') && (
            <TabsTrigger value="property-likes" className="whitespace-nowrap px-4 py-2 text-sm font-medium rounded-full text-gray-300 data-[state=active]:bg-white/20 data-[state=active]:text-white border-none shadow-none">
              Property Likes
            </TabsTrigger>
          )}
          <TabsTrigger value="transactions" className="whitespace-nowrap px-4 py-2 text-sm font-medium rounded-full text-gray-300 data-[state=active]:bg-white/20 data-[state=active]:text-white border-none shadow-none">
            Transactions
          </TabsTrigger>
          {user.role === 'admin' && (
            <TabsTrigger value="all-properties" className="whitespace-nowrap px-4 py-2 text-sm font-medium rounded-full text-gray-300 data-[state=active]:bg-white/20 data-[state=active]:text-white border-none shadow-none">
              {t("dash.properties")}
            </TabsTrigger>
          )}
          {user.role === 'admin' && (
            <TabsTrigger value="users" className="whitespace-nowrap px-4 py-2 text-sm font-medium rounded-full text-gray-300 data-[state=active]:bg-white/20 data-[state=active]:text-white border-none shadow-none">
              {t("dash.users")}
            </TabsTrigger>
          )}
          {user.role === 'admin' && (
            <TabsTrigger value="admin-subscriptions" className="whitespace-nowrap px-4 py-2 text-sm font-medium rounded-full text-gray-300 data-[state=active]:bg-white/20 data-[state=active]:text-white border-none shadow-none">
              {t("dash.subscriptions")}
            </TabsTrigger>
          )}
          {user.role === 'admin' && (
            <TabsTrigger value="payment-settings" className="whitespace-nowrap px-4 py-2 text-sm font-medium rounded-full text-gray-300 data-[state=active]:bg-white/20 data-[state=active]:text-white border-none shadow-none">
              {t("dash.payments")}
            </TabsTrigger>
          )}
          {user.role === 'admin' && (
            <TabsTrigger value="sms-settings" className="whitespace-nowrap px-4 py-2 text-sm font-medium rounded-full text-gray-300 data-[state=active]:bg-white/20 data-[state=active]:text-white border-none shadow-none">
              {t("dash.sms")}
            </TabsTrigger>
          )}
          {user.role === 'admin' && (
            <TabsTrigger value="admin-reviews" className="whitespace-nowrap px-4 py-2 text-sm font-medium rounded-full text-gray-300 data-[state=active]:bg-white/20 data-[state=active]:text-white border-none shadow-none">
              Reviews
            </TabsTrigger>
          )}
          {user.role === 'admin' && (
            <TabsTrigger value="notif-templates" className="whitespace-nowrap px-4 py-2 text-sm font-medium rounded-full text-gray-300 data-[state=active]:bg-white/20 data-[state=active]:text-white border-none shadow-none flex items-center gap-1.5">
              <Bell className="w-4 h-4" /> Notifications
            </TabsTrigger>
          )}
          {user.role === 'admin' && (
            <TabsTrigger value="admin-marketing" className="whitespace-nowrap px-4 py-2 text-sm font-medium rounded-full text-gray-300 data-[state=active]:bg-white/20 data-[state=active]:text-white border-none shadow-none flex items-center gap-1.5">
              <Users className="w-4 h-4" /> Marketing
            </TabsTrigger>
          )}
          {isMarketer && (
            <TabsTrigger value="my-marketing" className="whitespace-nowrap px-4 py-2 text-sm font-medium rounded-full text-gray-300 data-[state=active]:bg-white/20 data-[state=active]:text-white border-none shadow-none flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4" /> My Marketing
            </TabsTrigger>
          )}
        </TabsList>
      </div>

      {/* Desktop Sidebar */}
      <div className="w-[280px] flex-shrink-0 bg-zinc-900 flex-col h-screen overflow-hidden hidden md:flex">
        {/* Logo */}
        <div className="p-6 pb-2">
            <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer mb-6">
                <BrandWordmark inverse />
            </div>
            </Link>
            <div className="mb-6">
              <p className="text-zinc-400 text-xs font-semibold tracking-widest uppercase mb-1">{user.role} {t("dash.portal")}</p>
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 py-2">
            <TabsList className="flex flex-col w-full h-auto bg-transparent p-0 space-y-1">
            <TabsTrigger value="overview" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-[#b8d4f0] data-[state=active]:bg-zinc-700 data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <Home className="w-5 h-5 mr-3" /> {t("dash.dashboard")}
            </TabsTrigger>
            <TabsTrigger value="settings" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-[#b8d4f0] data-[state=active]:bg-zinc-700 data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <UserCircle className="w-5 h-5 mr-3" /> {t("dash.my_profile")}
            </TabsTrigger>
            <TabsTrigger value="messages" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-[#b8d4f0] data-[state=active]:bg-zinc-700 data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <MessageSquare className="w-5 h-5 mr-3" /> {t("dash.messages")}
            </TabsTrigger>
            <TabsTrigger value="bookings" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-[#b8d4f0] data-[state=active]:bg-zinc-700 data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <Calendar className="w-5 h-5 mr-3" /> {t("dash.bookings")}
                {user.role !== 'owner' && user.role !== 'host' && user.role !== 'admin' && unreadBookingCount > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-gray-900 text-white text-[10px] font-bold leading-none">
                    {unreadBookingCount > 99 ? "99+" : unreadBookingCount}
                  </span>
                )}
            </TabsTrigger>
            {(user.role === 'tenant' || user.role === 'guest') && (
                <TabsTrigger value="saved" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-[#b8d4f0] data-[state=active]:bg-zinc-700 data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <Heart className="w-5 h-5 mr-3" /> Saved Properties
                {favorites.length > 0 && <span className="ml-auto inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-gray-900 text-white text-[10px] font-bold leading-none">{favorites.length}</span>}
                </TabsTrigger>
            )}
            <TabsTrigger value="analytics" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-[#b8d4f0] data-[state=active]:bg-zinc-700 data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <BarChart3 className="w-5 h-5 mr-3" /> {t("dash.analytics")}
            </TabsTrigger>
            {(user.role === 'owner' || user.role === 'host') && (
                <TabsTrigger value="subscription" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-[#b8d4f0] data-[state=active]:bg-zinc-700 data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <Crown className="w-5 h-5 mr-3" /> {t("dash.subscription")}
                </TabsTrigger>
            )}
            {(user.role === 'owner' || user.role === 'host') && (
                <TabsTrigger value="listings" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-[#b8d4f0] data-[state=active]:bg-zinc-700 data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <FileText className="w-5 h-5 mr-3" /> {t("dash.listings")}
                </TabsTrigger>
            )}
            {(user.role === 'owner' || user.role === 'host') && (
                <TabsTrigger value="reservations" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-[#b8d4f0] data-[state=active]:bg-zinc-700 data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <Users className="w-5 h-5 mr-3" /> {t("dash.reservations")}
                {unreadBookingCount > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-gray-900 text-white text-[10px] font-bold leading-none">
                    {unreadBookingCount > 99 ? "99+" : unreadBookingCount}
                  </span>
                )}
                </TabsTrigger>
            )}
            {(user.role === 'owner' || user.role === 'host') && (
                <TabsTrigger value="notifications" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-[#b8d4f0] data-[state=active]:bg-zinc-700 data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <Bell className="w-5 h-5 mr-3" /> {t("dash.notifications")}
                {unreadBookingCount > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-gray-900 text-white text-[10px] font-bold leading-none">
                    {unreadBookingCount > 99 ? "99+" : unreadBookingCount}
                  </span>
                )}
                </TabsTrigger>
            )}
            {(user.role === 'owner' || user.role === 'host') && (
                <TabsTrigger value="property-likes" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-[#b8d4f0] data-[state=active]:bg-zinc-700 data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <Heart className="w-5 h-5 mr-3" /> Property Likes
                {propertyLikes.some((p: any) => p.totalLikes > 0) && (
                  <span className="ml-auto inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-gray-900 text-white text-[10px] font-bold leading-none">
                    {propertyLikes.reduce((s: number, p: any) => s + p.totalLikes, 0)}
                  </span>
                )}
                </TabsTrigger>
            )}
            {(user.role === 'owner' || user.role === 'host' || user.role === 'tenant' || user.role === 'guest') && (
                <TabsTrigger value="transactions" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-[#b8d4f0] data-[state=active]:bg-zinc-700 data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <ShieldCheck className="w-5 h-5 mr-3" /> Transactions
                </TabsTrigger>
            )}
            {user.role === 'admin' && (
                <TabsTrigger value="all-properties" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-[#b8d4f0] data-[state=active]:bg-zinc-700 data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <Home className="w-5 h-5 mr-3" /> {t("dash.all_properties")}
                </TabsTrigger>
            )}
            {user.role === 'admin' && (
                <TabsTrigger value="users" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-[#b8d4f0] data-[state=active]:bg-zinc-700 data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <Users className="w-5 h-5 mr-3" /> {t("dash.users")}
                </TabsTrigger>
            )}
            {user.role === 'admin' && (
                <TabsTrigger value="admin-subscriptions" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-[#b8d4f0] data-[state=active]:bg-zinc-700 data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <Crown className="w-5 h-5 mr-3" /> {t("dash.subscriptions")}
                </TabsTrigger>
            )}
            {user.role === 'admin' && (
                <TabsTrigger value="payment-settings" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-[#b8d4f0] data-[state=active]:bg-zinc-700 data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <CreditCard className="w-5 h-5 mr-3" /> {t("dash.payments")}
                </TabsTrigger>
            )}
            {user.role === 'admin' && (
                <TabsTrigger value="sms-settings" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-[#b8d4f0] data-[state=active]:bg-zinc-700 data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <MessageSquare className="w-5 h-5 mr-3" /> {t("dash.sms_settings")}
                </TabsTrigger>
            )}
            {user.role === 'admin' && (
                <TabsTrigger value="admin-reviews" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-[#b8d4f0] data-[state=active]:bg-zinc-700 data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <Star className="w-5 h-5 mr-3" /> Reviews
                </TabsTrigger>
            )}
            {user.role === 'admin' && (
                <TabsTrigger value="transactions" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-[#b8d4f0] data-[state=active]:bg-zinc-700 data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <ShieldCheck className="w-5 h-5 mr-3" /> Transactions
                </TabsTrigger>
            )}
            {user.role === 'admin' && (
                <TabsTrigger value="notif-templates" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-[#b8d4f0] data-[state=active]:bg-zinc-700 data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <Bell className="w-5 h-5 mr-3" /> Notification Templates
                </TabsTrigger>
            )}
            {user.role === 'admin' && (
                <TabsTrigger value="admin-marketing" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-[#b8d4f0] data-[state=active]:bg-zinc-700 data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <Users className="w-5 h-5 mr-3" /> Marketing
                </TabsTrigger>
            )}
            {isMarketer && (
                <TabsTrigger value="my-marketing" className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg text-[#b8d4f0] data-[state=active]:bg-zinc-700 data-[state=active]:text-white hover:bg-white/5 hover:text-white transition-colors border-none shadow-none">
                <BarChart3 className="w-5 h-5 mr-3" /> My Marketing
                </TabsTrigger>
            )}
            </TabsList>
        </div>

        <div className="p-4 mt-auto mb-4 mx-4 border-t border-white/10 pt-6">
            <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-full bg-zinc-700 flex items-center justify-center text-white font-semibold shrink-0 overflow-hidden">
                {user.avatar?.startsWith("/objects/")
                  ? <img src={`/api/storage${user.avatar}`} alt={user.name} className="h-full w-full object-cover" key={user.avatar} />
                  : user.avatar
                    ? <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" key={user.avatar} />
                    : user.name.charAt(0).toUpperCase()}
            </div>
            <div className="text-white min-w-0">
                <div className="font-medium text-sm leading-tight truncate">{user.name}</div>
                <div className="text-xs text-zinc-400 leading-tight truncate mt-1">{user.email || `${user.role}@inndos.com`}</div>
            </div>
            </div>
            <Button variant="ghost" className="w-full justify-start text-zinc-400 hover:text-white hover:bg-white/5 px-2 font-normal" onClick={logout}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-3"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
            {t("dash.sign_out")}
            </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-[calc(100vh-120px)] md:h-screen overflow-hidden">
        {/* Desktop Header */}
        <div className="bg-white border-b px-8 py-4 hidden md:flex items-center justify-between shrink-0 shadow-sm z-10">
            <h2 className="text-xl font-bold text-gray-800">Dashboard</h2>
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="text-gray-500 rounded-full hover:bg-gray-100"><Bell className="w-5 h-5" /></Button>
                <Link href="/">
                <Button variant="outline" size="sm" className="gap-2 font-medium text-gray-700 bg-white hover:bg-gray-50"><ExternalLink className="w-4 h-4" /> Back to Site</Button>
                </Link>
            </div>
        </div>
        
        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50">
            {activeTab === 'overview' && (
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">{t("dash.welcome")} {user.name.split(' ')[0]}!</h1>
                  <p className="text-gray-500 text-sm">{t("dash.overview_sub").replace("{role}", user.role)}</p>
                </div>
                {(user?.role === 'owner' || user?.role === 'host') && (
                  <Link href="/add-listing">
                    <Button className="bg-zinc-900 hover:bg-zinc-800 text-white gap-2 shadow-sm rounded-full px-5 h-10">
                      <Plus className="h-4 w-4" />
                      {t("dash.list_property")}
                    </Button>
                  </Link>
                )}
                {(user?.role === 'tenant' || user?.role === 'guest') && (
                  <Button
                    className="bg-zinc-900 hover:bg-zinc-800 text-white gap-2 shadow-sm rounded-full px-5 h-10"
                    onClick={() => { setUpgradeTargetRole(null); setShowUpgradeDialog(true); }}
                  >
                    <Plus className="h-4 w-4" />
                    {t("dash.list_property")}
                  </Button>
                )}
              </div>
            )}
            {/* ANALYTICS TAB — role-specific */}
          <TabsContent value="analytics" className="space-y-6">
            {user.role === 'admin' && (
              <AdminAnalyticsDashboard token={token} onNavigate={setActiveTab} />
            )}
            {(user.role === 'owner' || user.role === 'host') && (
              <OwnerAnalytics token={token} onNavigate={setActiveTab} />
            )}
            {(user.role === 'tenant' || user.role === 'guest') && (
              <TenantAnalytics token={token} onNavigate={setActiveTab} />
            )}
          </TabsContent>

          {/* BOOKINGS TAB */}
          <TabsContent value="bookings" className="space-y-6">
            {/* Owner/Host: show bookings received on their properties */}
            {(user.role === 'owner' || user.role === 'host') ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" /> {t("dash.reservations_received")}
                  </CardTitle>
                  <CardDescription>{t("dash.reservations_received_desc")}</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingReceivedBookings ? (
                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" /> {t("dash.loading_reservations")}
                    </div>
                  ) : receivedBookings.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground bg-gray-50 rounded-lg border border-dashed">
                      <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-medium text-gray-900">{t("dash.no_reservations")}</h3>
                      <p className="mb-4">{t("dash.no_reservations_desc")}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {receivedBookings.map((b: any) => (
                        <div key={b.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border rounded-lg bg-white shadow-sm hover:bg-gray-50 transition-colors">
                          {(() => {
                            const rawCover = (b.propertyImages && b.propertyImages.length > 0) ? b.propertyImages[0] : (b.propertyImage || null);
                            const coverPhoto = resolvePropertyImageUrl(rawCover);
                            return rawCover ? <img src={coverPhoto} alt={b.propertyTitle || "Property"} className="h-20 w-20 object-cover rounded-md shrink-0" onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/images/modern_apartment_exterior.png"; }} /> : null;
                          })()}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-base truncate">{b.propertyTitle || "Unknown Property"}</h4>
                            <p className="text-sm text-muted-foreground truncate">{b.propertyAddress}</p>
                            <p className="text-sm font-medium mt-1">Guest: {b.guestName || '—'}</p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              <Badge variant={b.status === 'confirmed' ? 'default' : b.status === 'cancelled' ? 'destructive' : 'secondary'}>
                                {b.status ? b.status.charAt(0).toUpperCase() + b.status.slice(1) : 'Pending'}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            {b.startDate && b.endDate && (
                              <p className="text-sm text-muted-foreground">
                                {new Date(b.startDate).toLocaleDateString()} – {new Date(b.endDate).toLocaleDateString()}
                              </p>
                            )}
                            {b.totalPrice != null && (
                              <p className="font-bold text-lg text-primary mt-1">KES {Number(b.totalPrice).toLocaleString()}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              /* Tenant/Guest: show their own bookings */
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" /> {t("dash.my_bookings")}
                  </CardTitle>
                  <CardDescription>{t("dash.my_bookings_desc")}</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingBookings ? (
                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" /> {t("dash.loading_bookings")}
                    </div>
                  ) : bookings.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground bg-gray-50 rounded-lg border border-dashed">
                      <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-medium text-gray-900">{t("dash.no_bookings")}</h3>
                      <p className="mb-4">{t("dash.no_bookings_desc")}</p>
                      <Link href="/properties">
                        <Button variant="outline">{t("dash.browse_props")}</Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {bookings.map((b: any) => {
                        const rawCover = (b.propertyImages && b.propertyImages.length > 0) ? b.propertyImages[0] : (b.propertyImage || null);
                        const coverPhoto = resolvePropertyImageUrl(rawCover);
                        return (
                        <div key={b.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border rounded-lg bg-white shadow-sm hover:bg-gray-50 transition-colors">
                          <img src={coverPhoto} alt={b.propertyTitle || "Property"} className="h-20 w-20 object-cover rounded-md shrink-0" onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/images/modern_apartment_exterior.png"; }} />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-base truncate">{b.propertyTitle || "Unknown Property"}</h4>
                            <p className="text-sm text-muted-foreground truncate">{b.propertyAddress}</p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              <Badge variant={b.status === 'confirmed' ? 'default' : b.status === 'cancelled' ? 'destructive' : 'secondary'}>
                                {b.status ? b.status.charAt(0).toUpperCase() + b.status.slice(1) : 'Pending'}
                              </Badge>
                              {b.propertyType && <Badge variant="outline">{b.propertyType}</Badge>}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            {b.startDate && b.endDate && (
                              <p className="text-sm text-muted-foreground">
                                {new Date(b.startDate).toLocaleDateString()} – {new Date(b.endDate).toLocaleDateString()}
                              </p>
                            )}
                            {b.totalPrice != null && (
                              <p className="font-bold text-lg text-primary mt-1">KES {Number(b.totalPrice).toLocaleString()}</p>
                            )}
                            {b.status === "confirmed" && (
                              reviewedBookingIds.has(b.id) ? (
                                <span className="mt-2 inline-flex items-center gap-1 text-xs text-gray-500"><Star className="h-3 w-3 fill-gray-400 text-gray-400" /> Reviewed</span>
                              ) : (
                                <Button size="sm" variant="outline" className="mt-2 text-xs h-7 px-2 gap-1" onClick={() => { setReviewModal({ open: true, booking: b }); setReviewRating(0); setReviewHover(0); setReviewComment(""); }}>
                                  <Star className="h-3 w-3" /> Rate Stay
                                </Button>
                              )
                            )}
                          </div>
                        </div>
                      );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* MESSAGES TAB (Shared) */}
          <TabsContent value="messages" className="space-y-6">
             <Card>
               <CardHeader>
                 <CardTitle>{t("dash.inbox")}</CardTitle>
                 <CardDescription>{t("dash.inbox_desc")}</CardDescription>
               </CardHeader>
               <CardContent>
                 <MessagingSystem />
               </CardContent>
             </Card>
          </TabsContent>

          {/* OWNER & HOST DASHBOARD */}
          {(user.role === 'owner' || user.role === 'host') && (
            <>
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="hover:shadow-md transition-all cursor-pointer bg-white border-l-4 border-l-blue-500" onClick={() => setActiveTab("listings")}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-medium text-muted-foreground">{t("dash.total_listings")}</p>
                        <Home className="h-4 w-4 text-gray-500" />
                      </div>
                      <div className="text-2xl font-bold">{ownerProperties.length}</div>
                      <p className="text-xs text-gray-600 flex items-center mt-1">
                        <ArrowUpRight className="h-3 w-3 mr-1" /> {t("dash.active_now")}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="hover:shadow-md transition-all cursor-pointer bg-white border-l-4 border-l-purple-500" onClick={() => setActiveTab("reservations")}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-medium text-muted-foreground">{t("dash.bookings")}</p>
                        <MessageSquare className="h-4 w-4 text-gray-500" />
                      </div>
                      <div className="text-2xl font-bold">{isLoadingReceivedBookings ? '—' : receivedBookingsCount}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {isLoadingReceivedBookings
                          ? t("dash.loading")
                          : receivedBookingsCount === 0
                          ? t("dash.no_bookings_yet")
                          : (() => {
                              const pendingCount = receivedBookings.filter((b: any) => !b.status || b.status === 'pending').length;
                              const confirmedCount = receivedBookings.filter((b: any) => b.status === 'confirmed').length;
                              const parts = [];
                              if (pendingCount > 0) parts.push(`${pendingCount} ${t("dash.pending").toLowerCase()}`);
                              if (confirmedCount > 0) parts.push(`${confirmedCount} confirmed`);
                              return parts.length > 0 ? parts.join(' · ') : t("dash.bookings");
                            })()
                        }
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="hover:shadow-md transition-all cursor-pointer bg-white border-l-4 border-l-orange-500" onClick={() => setActiveTab("reservations")}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-medium text-muted-foreground">{t("dash.check_ins")}</p>
                        <Calendar className="h-4 w-4 text-gray-500" />
                      </div>
                      <div className="text-2xl font-bold">{isLoadingReceivedBookings ? '—' : todayCheckIns.length}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {nextCheckIn
                          ? `Next: ${new Date(nextCheckIn.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                          : t("dash.no_upcoming_checkins")}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="hover:shadow-md transition-all cursor-pointer bg-white border-l-4 border-l-green-500" onClick={() => setActiveTab("analytics")}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-medium text-muted-foreground">{t("dash.revenue")}</p>
                        <DollarSign className="h-4 w-4 text-gray-500" />
                      </div>
                      <div className="text-2xl font-bold">KES {isLoadingReceivedBookings ? '—' : receivedRevenue.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("dash.from_confirmed")}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                   <Card>
                    <CardHeader>
                      <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isLoadingReceivedBookings ? (
                        <div className="flex items-center justify-center py-8 text-muted-foreground">
                          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
                        </div>
                      ) : receivedBookings.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Clock className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">No recent activity yet</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {receivedBookings.slice(0, 5).map((b: any) => {
                            const initials = (b.guestName || 'G').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                            const ago = b.createdAt ? (() => {
                              const diff = Date.now() - new Date(b.createdAt).getTime();
                              const h = Math.floor(diff / 3600000);
                              if (h < 1) return 'Just now';
                              if (h < 24) return `${h}h ago`;
                              return `${Math.floor(h / 24)}d ago`;
                            })() : '';
                            return (
                              <div key={b.id} className="flex gap-3 items-start p-3 hover:bg-gray-50 rounded transition-colors">
                                <div className="h-8 w-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                  {initials}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {b.guestName || 'A guest'} booked &ldquo;{b.propertyTitle || 'your property'}&rdquo;
                                  </p>
                                  <p className="text-xs text-muted-foreground">{ago}</p>
                                </div>
                                <Badge variant={b.status === 'confirmed' ? 'default' : b.status === 'cancelled' ? 'destructive' : 'secondary'} className="shrink-0 text-xs">
                                  {b.status || 'pending'}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Performance Stats</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center h-[200px] text-muted-foreground bg-gray-50 rounded-lg border border-dashed">
                      <BarChart3 className="h-8 w-8 mb-2" /> Chart Visualization Placeholder
                    </CardContent>
                  </Card>
                </div>

                {/* Transaction Confirmations — compact prompt for owner */}
                <TransactionConfirmations
                  userId={user.id}
                  userRole={user.role as "owner" | "host"}
                  token={token}
                  compact={true}
                />
              </TabsContent>

              <TabsContent value="listings" className="space-y-6">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">My Properties</h2>
                    <p className="text-sm text-gray-500">Manage your listings — pending ones await admin approval</p>
                  </div>
                  <Link href="/add-listing">
                    <Button className="bg-zinc-900 hover:bg-zinc-800 text-white gap-2 shadow-sm rounded-full px-4 h-10">
                      <Plus className="h-4 w-4" />
                      List Property
                    </Button>
                  </Link>
                </div>
                <Card>
                  <CardHeader className="hidden">
                    <CardTitle>My Properties</CardTitle>
                    <CardDescription>Manage your active listings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!isLoadingProperties && ownerProperties.length > 0 && (
                      <div className="flex flex-col sm:flex-row gap-2 mb-4">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <input type="text" value={myPropSearch} onChange={e => setMyPropSearch(e.target.value)} placeholder="Search by title or address…" className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-800 bg-gray-50" />
                        </div>
                        <select value={myPropStatusFilter} onChange={e => setMyPropStatusFilter(e.target.value)} className="text-sm border rounded-lg px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-zinc-800 sm:w-36">
                          <option value="all">All Statuses</option>
                          <option value="active">Active</option>
                          <option value="pending">Pending</option>
                          <option value="flagged">Flagged</option>
                          <option value="sold">Sold</option>
                        </select>
                        {(myPropSearch || myPropStatusFilter !== "all") && (
                          <button onClick={() => { setMyPropSearch(""); setMyPropStatusFilter("all"); }} className="text-xs text-muted-foreground hover:text-foreground underline px-1 shrink-0">Clear</button>
                        )}
                      </div>
                    )}
                    {isLoadingProperties ? (
                      <div className="flex items-center justify-center py-12 text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading your listings...
                      </div>
                    ) : (
                    <div className="space-y-4">
                      {ownerProperties.filter(p => {
                        if (myPropSearch) { const q = myPropSearch.toLowerCase(); if (!(p.title||"").toLowerCase().includes(q) && !(p.address||"").toLowerCase().includes(q)) return false; }
                        if (myPropStatusFilter === "active" && (!p.isVerified || p.propertyStatus === 'flagged' || p.propertyStatus === 'sold')) return false;
                        if (myPropStatusFilter === "pending" && (p.isVerified || p.propertyStatus === 'flagged' || p.propertyStatus === 'sold')) return false;
                        if (myPropStatusFilter === "flagged" && p.propertyStatus !== 'flagged') return false;
                        if (myPropStatusFilter === "sold" && p.propertyStatus !== 'sold') return false;
                        return true;
                      }).map(p => {
                        const isSold = p.propertyStatus === 'sold';
                        const isFlagged = p.propertyStatus === 'flagged';
                        const isPending = !p.isVerified && !isFlagged && !isSold;
                        return (
                        <div key={p.id} className={`flex flex-col gap-3 p-4 border rounded-lg transition-colors shadow-sm ${isSold ? 'bg-gray-50/60 border-gray-300' : isFlagged ? 'bg-red-50/40 border-red-200' : isPending ? 'bg-yellow-50/40 border-yellow-200' : 'bg-white hover:bg-gray-50'}`}>
                          <div className="flex items-start gap-3">
                            <img src={getImageUrl(p.image)} className={`h-16 w-16 sm:h-20 sm:w-20 object-cover rounded-md flex-shrink-0 ${isSold || !p.isVerified ? 'opacity-70 grayscale-[40%]' : ''}`} alt={p.title} />
                            <div className="flex-1 min-w-0">
                              <Link href={`/property/${p.id}`}>
                                <h4 className="font-semibold text-base sm:text-lg truncate hover:text-primary cursor-pointer">{p.title}</h4>
                              </Link>
                              <p className="text-sm text-muted-foreground truncate">{p.address}</p>
                              <div className="flex gap-2 mt-1.5 flex-wrap">
                                {isSold ? (
                                  <Badge variant="outline" className="bg-gray-200 text-gray-700 border-gray-400 text-xs">Sold</Badge>
                                ) : isFlagged ? (
                                  <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300 text-xs">Flagged</Badge>
                                ) : isPending ? (
                                  <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200 text-xs">Pending</Badge>
                                ) : p.isVerified ? (
                                  <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300 text-xs">Verified & Live</Badge>
                                ) : null}
                                <Badge variant="secondary" className="text-xs">{p.type}</Badge>
                              </div>
                              <div className="font-bold text-base sm:text-xl text-primary mt-1.5">KES {p.price.toLocaleString()}</div>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {isFlagged && !isSold && (
                              <Button size="sm" className="gap-1 bg-gray-900 hover:bg-gray-800 text-white" onClick={() => handleOwnerResubmit(p.id)}>
                                <ArrowUpRight className="h-3 w-3" /> Resubmit
                              </Button>
                            )}
                            {p.isVerified && !isSold && (
                              <Button size="sm" variant={p.status === 'inactive' ? 'default' : 'outline'} onClick={() => handleTogglePropertyStatus(p.id)}>
                                {p.status === 'inactive' ? 'Activate' : 'Deactivate'}
                              </Button>
                            )}
                               {p.isVerified && !isSold && (
                                 <Button size="sm" variant={p.isFeatured ? "secondary" : "outline"} disabled={featureLoading[p.id]} onClick={() => handleFeatureListing(p)}>
                                   {featureLoading[p.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : p.isFeatured ? "Unfeature" : "Feature"}
                                 </Button>
                               )}
                            {p.isVerified && !isSold && (p.confirmedBookings ?? 0) > 0 && (
                              <Button
                                size="sm" variant="outline"
                                className="gap-1 text-primary border-primary/30 hover:bg-primary/5"
                                onClick={() => setCalendarProperty({ id: p.id, title: p.title })}
                              >
                                <Calendar className="h-3 w-3" /> Calendar
                              </Button>
                            )}
                            <Link href={`/property/${p.id}`}>
                              <Button size="sm" variant="outline" className="gap-1">
                                <Eye className="h-3 w-3" /> View
                              </Button>
                            </Link>
                            {!isFlagged && !isSold && (
                              <Link href={`/add-listing?edit=${p.id}`}>
                                <Button size="sm" variant="outline">Edit</Button>
                              </Link>
                            )}
                            <Button size="sm" variant="destructive" className="gap-1" onClick={() => handleDeleteProperty(p.id)}>
                              <Trash2 className="h-3 w-3" /> Delete
                            </Button>
                          </div>
                          {isFlagged && p.adminComment && (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">
                              <p className="font-semibold text-gray-800 mb-1 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Admin Feedback</p>
                              <p className="text-gray-700">{p.adminComment}</p>
                              <p className="text-xs text-gray-500 mt-2">Please address the above issues, then click <strong>Resubmit</strong> to send for re-review.</p>
                            </div>
                          )}
                        </div>
                        );
                      })}
                      {pendingProperties.length > 0 && pendingProperties.map((p: any) => (
                        <div key={`pending-${p.id}`} className="flex items-center gap-4 p-4 border border-yellow-200 rounded-lg hover:bg-yellow-50 transition-colors group bg-yellow-50/30 shadow-sm">
                          <img src={getImageUrl(p.image)} className="h-20 w-20 object-cover rounded-md opacity-70 grayscale-[30%]" alt={p.title} />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-lg truncate text-gray-700">{p.title}</h4>
                            <p className="text-sm text-muted-foreground truncate">Awaiting Approval</p>
                            <div className="flex gap-2 mt-2">
                              <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200 hover:bg-yellow-100">Pending</Badge>
                              <Badge variant="secondary">{p.type}</Badge>
                            </div>
                          </div>
                          <div className="text-right flex flex-col items-end justify-center">
                            <div className="text-sm text-muted-foreground italic max-w-[150px]">
                              In review queue
                            </div>
                          </div>
                        </div>
                      ))}
                      {ownerProperties.length === 0 && pendingProperties.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground bg-gray-50 rounded-lg border border-dashed">
                          <Home className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <h3 className="text-lg font-medium text-gray-900">No properties listed</h3>
                          <p className="mb-4">Get started by adding your first property.</p>
                          <Link href="/add-listing">
                            <Button>Add Listing</Button>
                          </Link>
                        </div>
                      )}
                    </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reservations" className="space-y-6">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Incoming Link-Ups</h2>
                    <p className="text-sm text-gray-500">Reservations made by guests on your properties</p>
                  </div>
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    {receivedBookings.length} total
                  </Badge>
                </div>
                <Card>
                  <CardContent className="pt-6">
                    {isLoadingReceivedBookings ? (
                      <div className="flex items-center justify-center py-12 text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading reservations...
                      </div>
                    ) : receivedBookings.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground bg-gray-50 rounded-lg border border-dashed">
                        <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-lg font-medium text-gray-900">No link-ups received yet</h3>
                        <p className="mb-4">Reservations from guests will appear here once they link up to your properties.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Search bar */}
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <input type="text" value={linkupsSearch} onChange={e => setLinkupsSearch(e.target.value)} placeholder="Search by guest, property or status…" className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-800 bg-gray-50" />
                        </div>
                        {(() => {
                          const lq = linkupsSearch.toLowerCase();
                          const filteredLinkups = receivedBookings
                            .filter(b => !linkupsSearch || (b.guestName ?? "").toLowerCase().includes(lq) || (b.propertyTitle ?? "").toLowerCase().includes(lq) || (b.status ?? "").toLowerCase().includes(lq))
                            .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
                          if (filteredLinkups.length === 0) return (
                            <div className="text-center py-8 text-muted-foreground text-sm bg-gray-50 rounded-lg border border-dashed">No link-ups match your search</div>
                          );
                          return filteredLinkups.map((b: any) => {
                        const rawCover = (b.propertyImages && b.propertyImages.length > 0) ? b.propertyImages[0] : (b.propertyImage || null);
                        const coverPhoto = resolvePropertyImageUrl(rawCover);
                        return (
                          <div key={b.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border rounded-lg bg-white shadow-sm hover:bg-gray-50 transition-colors">
                            <img src={coverPhoto} alt={b.propertyTitle || "Property"} className="h-20 w-20 object-cover rounded-md shrink-0" onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/images/modern_apartment_exterior.png"; }} />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-base truncate">{b.propertyTitle || "Unknown Property"}</h4>
                              <p className="text-sm text-muted-foreground truncate">{b.propertyAddress}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="h-6 w-6 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-700 font-semibold text-xs shrink-0">
                                  {b.guestName ? b.guestName.charAt(0).toUpperCase() : "G"}
                                </div>
                                <span className="text-sm font-medium text-gray-700">{b.guestName || "Guest"}</span>
                              </div>
                              <div className="flex flex-wrap gap-2 mt-2">
                                <Badge variant={b.status === 'confirmed' ? 'default' : b.status === 'cancelled' ? 'destructive' : 'secondary'}>
                                  {b.status ? b.status.charAt(0).toUpperCase() + b.status.slice(1) : 'Pending'}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 shrink-0">
                              {b.startDate && b.endDate && (
                                <p className="text-sm text-muted-foreground">
                                  {new Date(b.startDate).toLocaleDateString()} – {new Date(b.endDate).toLocaleDateString()}
                                </p>
                              )}
                              {b.totalPrice != null && (
                                <p className="font-bold text-lg text-primary">KES {Number(b.totalPrice).toLocaleString()}</p>
                              )}
                              {b.status === 'pending' && (
                                <div className="flex gap-2 mt-1">
                                  <Button
                                    size="sm"
                                    className="bg-gray-900 hover:bg-gray-800 text-white gap-1"
                                    disabled={bookingActionLoading[b.id]}
                                    onClick={() => handleBookingStatusUpdate(b.id, "confirmed")}
                                  >
                                    {bookingActionLoading[b.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                    Confirm
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-red-300 text-gray-600 hover:bg-red-50 gap-1"
                                    disabled={bookingActionLoading[b.id]}
                                    onClick={() => handleBookingStatusUpdate(b.id, "cancelled")}
                                  >
                                    {bookingActionLoading[b.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                                    Decline
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                        }); })()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notifications" className="space-y-6">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
                    <p className="text-sm text-gray-500">Alerts for link-ups on your properties</p>
                  </div>
                  {ownerNotifications.some(n => !n.isRead) && (
                    <Button variant="outline" size="sm" onClick={clearAllNotifications} className="gap-2 text-gray-600">
                      <Check className="h-4 w-4" /> Mark all as read
                    </Button>
                  )}
                </div>
                <Card>
                  <CardContent className="pt-6">
                    {isLoadingNotifications ? (
                      <div className="flex items-center justify-center py-12 text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading notifications...
                      </div>
                    ) : ownerNotifications.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground bg-gray-50 rounded-lg border border-dashed">
                        <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-lg font-medium text-gray-900">No notifications yet</h3>
                        <p className="mb-4">You'll be notified here whenever a guest links up to one of your properties.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {[...ownerNotifications].reverse().map((n: any) => {
                          const timeAgo = (() => {
                            const diff = Date.now() - new Date(n.createdAt).getTime();
                            const mins = Math.floor(diff / 60000);
                            if (mins < 1) return "just now";
                            if (mins < 60) return `${mins}m ago`;
                            const hrs = Math.floor(mins / 60);
                            if (hrs < 24) return `${hrs}h ago`;
                            const days = Math.floor(hrs / 24);
                            if (days < 7) return `${days}d ago`;
                            return new Date(n.createdAt).toLocaleDateString();
                          })();
                          const startLabel = n.bookingStartDate
                            ? new Date(n.bookingStartDate).toLocaleDateString()
                            : null;
                          const endLabel = n.bookingEndDate
                            ? new Date(n.bookingEndDate).toLocaleDateString()
                            : null;
                          return (
                            <div
                              key={n.id}
                              className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${n.isRead ? "bg-white" : "bg-gray-50 border-gray-200"}`}
                            >
                              <div className={`mt-0.5 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${n.isRead ? "bg-gray-100 text-gray-500" : "bg-gray-100 text-gray-600"}`}>
                                <Bell className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                {n.propertyTitle && (
                                  <p className="text-sm font-semibold text-gray-900 truncate">{n.propertyTitle}</p>
                                )}
                                {n.guestName && (
                                  <p className="text-sm text-gray-700">
                                    Guest: <span className="font-medium">{n.guestName}</span>
                                  </p>
                                )}
                                {startLabel && endLabel && (
                                  <p className="text-sm text-muted-foreground">
                                    {startLabel} – {endLabel}
                                  </p>
                                )}
                                {!n.propertyTitle && (
                                  <p className="text-sm text-gray-700">{n.message}</p>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
                              </div>
                              {!n.isRead && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="shrink-0 text-gray-600 hover:text-gray-700 hover:bg-gray-100 h-7 px-2 text-xs"
                                  onClick={() => markOneNotificationRead(n.id)}
                                >
                                  Mark read
                                </Button>
                              )}
                              {n.isRead && (
                                <span className="shrink-0 text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                  <Check className="h-3 w-3" /> Read
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </>
          )}

          {/* TENANT & GUEST DASHBOARD */}
          {(user.role === 'tenant' || user.role === 'guest') && (
            <TabsContent value="overview" className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-white border-l-4 border-l-red-500 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-medium text-muted-foreground">Favorites</p>
                      <Heart className="h-4 w-4 text-gray-500" />
                    </div>
                    <div className="text-2xl font-bold">{favorites.length}</div>
                  </CardContent>
                </Card>
                <Card className="bg-white border-l-4 border-l-blue-500 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-2">
                       <p className="text-sm font-medium text-muted-foreground">Messages</p>
                       <MessageSquare className="h-4 w-4 text-gray-500" />
                    </div>
                    <div className="text-2xl font-bold">{messages.length}</div>
                  </CardContent>
                </Card>
                <Card className="bg-white border-l-4 border-l-purple-500 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-2">
                       <p className="text-sm font-medium text-muted-foreground">{user.role === 'guest' ? 'Upcoming Trips' : 'Scheduled Visits'}</p>
                       <Clock className="h-4 w-4 text-gray-500" />
                    </div>
                    <div className="text-2xl font-bold">{bookings.length}</div>
                    <p className="text-xs text-muted-foreground">Active link-ups</p>
                  </CardContent>
                </Card>
              </div>

              {/* Transaction Confirmations — compact prompt for tenant/guest */}
              <TransactionConfirmations
                userId={user.id}
                userRole={user.role as "tenant" | "guest"}
                token={token}
                compact={true}
              />

              {/* Saved Properties preview in overview — up to 3 */}
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Saved Properties</h2>
                  {favorites.length > 0 && (
                    <Button variant="outline" size="sm" onClick={() => setActiveTab("saved")}>
                      View all {favorites.length}
                    </Button>
                  )}
                </div>
                {favorites.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground border rounded-lg bg-white">
                    <Heart className="h-8 w-8 mb-3 text-gray-300" />
                    <p className="text-sm">You haven't saved any properties yet.</p>
                    <Link href="/"><Button variant="outline" size="sm" className="mt-4">Browse Listings</Button></Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {favorites.slice(0, 3).map((p: any) => (
                      <Link key={p.id} href={`/property/${p.id}`}>
                        <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                          <div className="h-40 bg-gray-100 relative">
                            <img src={p.image} alt={p.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.jpg'; }} />
                            <div className="absolute top-2 left-2 bg-black text-white text-[10px] font-bold px-2 py-0.5 rounded capitalize">{p.type}</div>
                          </div>
                          <CardContent className="p-3">
                            <p className="font-semibold text-sm line-clamp-1">{p.title}</p>
                            <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{p.address}</p>
                            <p className="text-sm font-bold mt-1">KES {Number(p.price).toLocaleString()}</p>
                            {p.savedAt && <p className="text-[10px] text-gray-400 mt-1">Saved {new Date(p.savedAt).toLocaleDateString()}</p>}
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          )}

          {/* SAVED PROPERTIES TAB — tenant/guest */}
          {(user.role === 'tenant' || user.role === 'guest') && (
            <TabsContent value="saved" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Saved Properties</h2>
                  <p className="text-sm text-gray-500 mt-1">{favorites.length} {favorites.length === 1 ? 'property' : 'properties'} saved</p>
                </div>
                <Link href="/"><Button variant="outline">Browse More</Button></Link>
              </div>
              {favorites.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border rounded-xl bg-white">
                  <Heart className="h-12 w-12 mb-4 text-gray-200" />
                  <p className="font-medium">No saved properties yet</p>
                  <p className="text-sm mt-1">Tap the heart icon on any listing to save it here.</p>
                  <Link href="/"><Button variant="outline" className="mt-6">Explore Properties</Button></Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {favorites.map((p: any) => (
                    <div key={p.id} className="relative group/card">
                      <Link href={`/property/${p.id}`}>
                        <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
                          <div className="h-48 bg-gray-100 relative">
                            <img src={p.image} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.jpg'; }} />
                            <div className="absolute top-2 left-2 bg-black text-white text-[10px] font-bold px-2 py-0.5 rounded capitalize">{p.type}</div>
                            {p.isVerified && <div className="absolute top-2 right-2 bg-gray-900 text-white text-[10px] font-bold px-2 py-0.5 rounded">Verified</div>}
                          </div>
                          <CardContent className="p-4">
                            <p className="font-semibold line-clamp-1">{p.title}</p>
                            <p className="text-xs text-gray-500 line-clamp-1 mt-1">{p.address}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                              {p.beds && <span>{p.beds} bed{p.beds !== 1 ? 's' : ''}</span>}
                              {p.baths && <span>{p.baths} bath{p.baths !== 1 ? 's' : ''}</span>}
                              {p.sqft && <span>{p.sqft} sqft</span>}
                            </div>
                            <div className="flex items-center justify-between mt-3">
                              <p className="font-bold text-sm">KES {Number(p.price).toLocaleString()}{p.type === 'rent' || p.type === 'bnb' || p.type === 'hotel' || p.type === 'hostel' ? '/mo' : ''}</p>
                              {p.savedAt && <p className="text-[10px] text-gray-400">❤ {new Date(p.savedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>}
                            </div>
                            {p.ownerName && <p className="text-[11px] text-gray-400 mt-1">Listed by {p.ownerName}</p>}
                          </CardContent>
                        </Card>
                      </Link>
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); unsaveFavorite(p.id); }}
                        className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-white/90 hover:bg-red-50 border border-gray-200 hover:border-red-300 text-gray-600 hover:text-gray-600 rounded-full px-2.5 py-1 text-[11px] font-medium shadow-sm transition-all opacity-0 group-hover/card:opacity-100 focus:opacity-100"
                        title="Remove from saved"
                        aria-label="Remove from saved"
                      >
                        <Heart className="h-3 w-3 fill-red-500 text-gray-500" />
                        Unsave
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          )}

          {/* PROPERTY LIKES TAB — owner/host */}
          {(user.role === 'owner' || user.role === 'host') && (
            <TabsContent value="property-likes" className="space-y-6">
              <PropertyLikesPanel
                propertyLikes={propertyLikes}
                isLoading={isLoadingPropertyLikes}
                onRefresh={fetchPropertyLikes}
              />
            </TabsContent>
          )}

          {/* ADMIN DASHBOARD */}
          {user.role === 'admin' && (
            <TabsContent value="overview" className="space-y-6">
              {isLoadingAdminStats ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading platform stats...
                </div>
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-white border-l-4 border-l-yellow-500 shadow-sm cursor-pointer hover:bg-yellow-50/10 transition-colors" onClick={() => setActiveTab("overview")}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-medium text-muted-foreground">Pending Reviews</p>
                      <FileText className="h-4 w-4 text-gray-600" />
                    </div>
                    <div className="text-3xl font-bold">{moderationQueue.length}</div>
                    <p className="text-xs text-muted-foreground mt-1">Properties awaiting verification</p>
                  </CardContent>
                </Card>
                <Card className="bg-white border-l-4 border-l-blue-500 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                      <Users className="h-4 w-4 text-gray-600" />
                    </div>
                    <div className="text-3xl font-bold">{usersCount.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground mt-1">Registered on the platform</p>
                  </CardContent>
                </Card>
                <Card className="bg-white border-l-4 border-l-green-500 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-medium text-muted-foreground">Platform Revenue</p>
                      <DollarSign className="h-4 w-4 text-gray-600" />
                    </div>
                    <div className="text-3xl font-bold">KES {revenue.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground mt-1">From non-cancelled bookings</p>
                  </CardContent>
                </Card>
                <Card className="bg-white border-l-4 border-l-purple-500 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-medium text-muted-foreground">Total Bookings</p>
                      <Calendar className="h-4 w-4 text-gray-600" />
                    </div>
                    <div className="text-3xl font-bold">{totalBookings.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground mt-1">All-time reservations</p>
                  </CardContent>
                </Card>
                <Card className="bg-white border-l-4 border-l-red-500 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-medium text-muted-foreground">Total Properties</p>
                      <Home className="h-4 w-4 text-gray-600" />
                    </div>
                    <div className="text-3xl font-bold">{totalProperties.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground mt-1">Listed on the platform</p>
                  </CardContent>
                </Card>
              </div>
              )}

              <div className="grid grid-cols-1 gap-6">
                <Card>
                  <CardHeader>
                     <CardTitle className="flex items-center gap-2">
                       <ShieldCheck className="h-5 w-5 text-primary" /> 
                       Moderation Queue
                       <Badge variant="secondary" className="ml-2">{moderationQueue.length}</Badge>
                     </CardTitle>
                     <CardDescription>Validate new property listings</CardDescription>
                  </CardHeader>
                  <CardContent>
                     <div className="space-y-4">
                       {isLoadingModeration ? (
                         <div className="flex items-center justify-center py-12 text-muted-foreground">
                           <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading moderation queue...
                         </div>
                       ) : moderationQueue.length > 0 ? (
                         moderationQueue.map(item => (
                           <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg bg-white shadow-sm">
                             <div className="flex items-center gap-4">
                               <div className="h-12 w-12 bg-gray-200 rounded-md overflow-hidden">
                                  <img src={getImageUrl(item.image)} className="h-full w-full object-cover" />
                               </div>
                               <div>
                                 <p className="font-bold text-sm">{item.title}</p>
                                 <p className="text-xs text-muted-foreground">
                                   Submitted by {item.ownerName || "Unknown"} • {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ""}
                                 </p>
                                 <Badge variant="outline" className="mt-1 text-[10px] h-4">{item.type}</Badge>
                               </div>
                             </div>
                             <div className="flex gap-2 flex-wrap">
                               <Dialog>
                                 <DialogTrigger asChild>
                                   <Button size="sm" variant="outline" className="text-gray-600 hover:text-gray-900">
                                     <Eye className="h-4 w-4 mr-1" /> View
                                   </Button>
                                 </DialogTrigger>
                                 <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                   <DialogHeader>
                                     <DialogTitle>Property Details</DialogTitle>
                                   </DialogHeader>
                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                     <div>
                                        <img src={getImageUrl(item.image)} className="w-full h-64 object-cover rounded-lg border" alt={item.title} />
                                     </div>
                                     <div className="space-y-4">
                                       <div>
                                         <h3 className="font-bold text-xl">{item.title}</h3>
                                         <p className="text-muted-foreground">{item.address || "Location not specified"}</p>
                                       </div>
                                       <div className="flex gap-2 flex-wrap">
                                         <Badge>{item.type}</Badge>
                                         <Badge variant="outline" className="text-primary font-bold">KES {item.price?.toLocaleString() || 0}</Badge>
                                         {item.propertyStatus === 'flagged' && (
                                           <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200">Previously Flagged</Badge>
                                         )}
                                       </div>
                                       <div className="grid grid-cols-2 gap-4 text-sm border-t pt-4">
                                         <div>
                                            <span className="text-muted-foreground block mb-1">Submitted By</span>
                                            <span className="font-medium flex items-center gap-2">
                                              <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">{item.ownerName?.charAt(0) || 'U'}</div>
                                              {item.ownerName || "Unknown"}
                                            </span>
                                         </div>
                                         <div>
                                            <span className="text-muted-foreground block mb-1">Submitted</span>
                                            <span className="font-medium">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "—"}</span>
                                         </div>
                                         <div>
                                            <span className="text-muted-foreground block mb-1">Specs</span>
                                            <span className="font-medium">{item.beds} Beds • {item.baths} Baths</span>
                                         </div>
                                         <div>
                                            <span className="text-muted-foreground block mb-1">Size</span>
                                            <span className="font-medium">{item.sqft} sqft</span>
                                         </div>
                                       </div>
                                       <div className="border-t pt-4">
                                          <span className="text-muted-foreground block text-sm mb-2">Description</span>
                                          <p className="text-sm">A {item.type} property located in {item.address || "a prime area"}. Pending review by the admin team.</p>
                                       </div>
                                     </div>
                                   </div>
                                   <DialogFooter className="mt-6 flex justify-end gap-2 border-t pt-4">
                                      <Button variant="outline" className="text-gray-600 hover:bg-gray-50 hover:text-gray-700 border-gray-200" onClick={() => { setFlagDialogId(item.id); setFlagComment(""); }}>
                                         <AlertTriangle className="h-4 w-4 mr-2" /> Flag & Return
                                      </Button>
                                      <Button className="bg-gray-900 hover:bg-gray-800 text-white" onClick={() => handleApprove(item.id)}>
                                         <Check className="h-4 w-4 mr-2" /> Approve & Publish
                                      </Button>
                                   </DialogFooter>
                                 </DialogContent>
                               </Dialog>
                               <Button size="sm" variant="outline" className="text-gray-600 hover:text-gray-700 hover:bg-gray-50 border-orange-200" onClick={() => { setFlagDialogId(item.id); setFlagComment(""); }}>
                                 <AlertTriangle className="h-4 w-4 mr-1" /> Flag
                               </Button>
                               <Button size="sm" className="bg-gray-900 hover:bg-gray-800 text-white" onClick={() => handleApprove(item.id)}>
                                 <Check className="h-4 w-4 mr-1" /> Approve
                               </Button>
                             </div>
                           </div>
                         ))
                       ) : (
                         <div className="text-center py-12 text-muted-foreground bg-gray-50 rounded-lg border border-dashed">
                           <Check className="h-12 w-12 mx-auto mb-4 text-gray-500/20" />
                           <p className="font-medium">All caught up!</p>
                           <p className="text-xs">No pending properties to review.</p>
                         </div>
                       )}
                     </div>
                  </CardContent>
                </Card>

              </div>

              {/* Transaction Confirmations — compact disputed view for admin overview */}
              <TransactionConfirmations
                userId={user.id}
                userRole="admin"
                token={token}
                compact={true}
              />
            </TabsContent>
          )}

          {/* TRANSACTIONS TAB — Full view for all roles */}
          <TabsContent value="transactions" className="space-y-6">
            <div className="mb-2">
              <h2 className="text-xl font-bold text-gray-900">Transaction Confirmations</h2>
              <p className="text-sm text-gray-500">
                {user.role === 'admin'
                  ? "Review, resolve and analyse all platform rental and sale transactions"
                  : "Confirm whether your rentals or sales were completed via inndos — this powers platform analytics"}
              </p>
            </div>
            <TransactionConfirmations
              userId={user.id}
              userRole={user.role as "owner" | "host" | "tenant" | "guest" | "admin"}
              token={token}
              compact={false}
            />
          </TabsContent>

          {user.role === 'admin' && (
            <TabsContent value="all-properties" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>All Platform Properties</CardTitle>
                  <CardDescription>Manage, edit or terminate existing listings across the platform</CardDescription>
                </CardHeader>
                <CardContent>
                  {!isLoadingAdminProperties && adminProperties.length > 0 && (
                    <div className="flex flex-col sm:flex-row gap-2 mb-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input type="text" value={propSearch} onChange={e => setPropSearch(e.target.value)} placeholder="Search by title or ID…" className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-800 bg-gray-50" />
                      </div>
                      <div className="relative sm:w-52">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input type="text" value={propLocationSearch} onChange={e => setPropLocationSearch(e.target.value)} placeholder="Filter by location…" className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-800 bg-gray-50" />
                      </div>
                      <select value={propStatusFilter} onChange={e => setPropStatusFilter(e.target.value)} className="text-sm border rounded-lg px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-zinc-800 sm:w-36">
                        <option value="all">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                      {(propSearch || propLocationSearch || propStatusFilter !== "all") && (
                        <button onClick={() => { setPropSearch(""); setPropLocationSearch(""); setPropStatusFilter("all"); }} className="text-xs text-muted-foreground hover:text-foreground underline px-1 shrink-0">Clear</button>
                      )}
                    </div>
                  )}
                  {isLoadingAdminProperties ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading properties...
                    </div>
                  ) : adminProperties.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">No properties found on the platform.</div>
                  ) : (() => {
                    const filteredProps = adminProperties.filter(p => {
                      if (propSearch) { const q = propSearch.toLowerCase(); if (!(p.title || "").toLowerCase().includes(q) && !(p.id || "").toLowerCase().includes(q)) return false; }
                      if (propLocationSearch) { const q = propLocationSearch.toLowerCase(); if (!(p.address || "").toLowerCase().includes(q) && !(p.location || "").toLowerCase().includes(q)) return false; }
                      if (propStatusFilter === "active" && !p.isVerified) return false;
                      if (propStatusFilter === "inactive" && p.isVerified) return false;
                      return true;
                    }).sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
                    return filteredProps.length === 0 ? (
                      <div className="text-center py-10 text-muted-foreground bg-gray-50 rounded-lg border border-dashed">
                        <p className="font-medium">No properties match your filters</p>
                        <p className="text-xs mt-1">Try adjusting the search or filters above</p>
                      </div>
                    ) : (
                  <div className="space-y-4">
                    {filteredProps.map(p => {
                      const isDeactivated = !p.isVerified;
                      const isActioning = !!adminPropertyActionLoading[p.id];
                      return (
                      <div key={p.id} className={`flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border rounded-lg transition-colors group shadow-sm ${isDeactivated ? 'bg-gray-50 opacity-75' : 'hover:bg-gray-50 bg-white'}`}>
                        <img src={getImageUrl(p.image)} className={`h-20 w-20 object-cover rounded-md flex-shrink-0 ${isDeactivated ? 'grayscale' : ''}`} alt={p.title} />
                        <div className="flex-1 min-w-0 w-full">
                          <div className="flex justify-between items-start">
                             <div>
                                <Link href={`/property/${p.id}`}>
                                  <h4 className="font-semibold text-lg truncate hover:text-primary cursor-pointer">{p.title}</h4>
                                </Link>
                                <p className="text-sm text-muted-foreground truncate">{p.address}</p>
                             </div>
                             <div className="font-bold text-xl text-primary">KES {Number(p.price).toLocaleString()}</div>
                          </div>
                          
                          <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
                            <div className="flex gap-2">
                              <Badge variant="outline" className={isDeactivated ? "bg-gray-100 text-gray-600 border-gray-200" : "bg-green-50 text-gray-700 border-green-200"}>
                                {isDeactivated ? 'Inactive' : 'Active'}
                              </Badge>
                              <Badge variant="secondary">{p.type}</Badge>
                              <span className="text-xs text-muted-foreground flex items-center ml-2 border-l pl-2">ID: {p.id.slice(0, 8)}</span>
                            </div>
                            
                            <div className="flex gap-2 items-center">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="outline" className="text-gray-600 hover:text-gray-900">
                                    <Eye className="h-4 w-4 mr-1" /> View
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                  <DialogHeader>
                                    <DialogTitle>Property Details</DialogTitle>
                                  </DialogHeader>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                    <div>
                                       <img src={getImageUrl(p.image)} className="w-full h-64 object-cover rounded-lg border" alt={p.title} />
                                    </div>
                                    <div className="space-y-4">
                                      <div>
                                        <h3 className="font-bold text-xl">{p.title}</h3>
                                        <p className="text-muted-foreground">{p.address || "Location not specified"}</p>
                                      </div>
                                      <div className="flex gap-2">
                                        <Badge>{p.type}</Badge>
                                        <Badge variant="outline" className="text-primary font-bold">
                                           KES {Number(p.price)?.toLocaleString() || 0}
                                        </Badge>
                                      </div>
                                      <div className="grid grid-cols-2 gap-4 text-sm border-t pt-4">
                                        {(p.beds || p.baths) && (
                                          <>
                                            <div>
                                               <span className="text-muted-foreground block mb-1">Specs</span>
                                               <span className="font-medium">{p.beds} Beds • {p.baths} Baths</span>
                                            </div>
                                            {p.sqft && (
                                            <div>
                                               <span className="text-muted-foreground block mb-1">Size</span>
                                               <span className="font-medium">{p.sqft} sqft</span>
                                            </div>
                                            )}
                                          </>
                                        )}
                                      </div>
                                      {p.description && (
                                      <div className="border-t pt-4">
                                         <span className="text-muted-foreground block text-sm mb-2">Description</span>
                                         <p className="text-sm">{p.description}</p>
                                      </div>
                                      )}
                                      {p.ownerName && (
                                      <div className="border-t pt-4 text-sm">
                                        <span className="text-muted-foreground block mb-1">Owner</span>
                                        <span className="font-medium">{p.ownerName}</span>
                                      </div>
                                      )}
                                    </div>
                                  </div>
                                  <DialogFooter className="mt-6 flex justify-end gap-2 border-t pt-4 flex-wrap">
                                     <Link href={`/property/${p.id}`}>
                                       <Button variant="outline" className="gap-1">
                                         <Eye className="h-4 w-4" /> Preview Listing
                                       </Button>
                                     </Link>
                                     <Button
                                       variant="outline"
                                       disabled={isActioning}
                                       className={isDeactivated ? "text-gray-600 hover:bg-green-50 hover:text-gray-700 border-green-200" : "text-gray-600 hover:bg-gray-50 hover:text-gray-700 border-gray-200"}
                                       onClick={() => handleAdminToggleProperty(p.id)}
                                     >
                                        {isActioning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : (isDeactivated ? <Check className="h-4 w-4 mr-2" /> : <AlertTriangle className="h-4 w-4 mr-2" />)}
                                        {isDeactivated ? 'Activate' : 'Deactivate'}
                                     </Button>
                                     <Button
                                       variant="outline"
                                       disabled={isActioning}
                                       className="text-gray-600 hover:bg-red-50 hover:text-gray-700 border-red-200"
                                       onClick={() => handleAdminDeleteProperty(p.id)}
                                     >
                                        {isActioning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                                        Delete Completely
                                     </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>

                              <Link href={`/property/${p.id}`}>
                                <Button size="sm" variant="outline" className="gap-1 text-gray-600 hover:text-gray-700 hover:bg-gray-50 border-gray-200">
                                  <ExternalLink className="h-3 w-3" /> Preview
                                </Button>
                              </Link>
                              <Link href={`/add-listing?edit=${p.id}`}>
                                <Button size="sm" variant="outline" className="gap-1">
                                  <Edit className="h-3 w-3" /> Edit
                                </Button>
                              </Link>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isActioning}
                                className={isDeactivated ? "text-gray-600 hover:text-gray-700 hover:bg-green-50" : "text-gray-600 hover:text-gray-700 hover:bg-gray-50"}
                                onClick={() => handleAdminToggleProperty(p.id)}
                              >
                                {isActioning ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : (isDeactivated ? <Check className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />)}
                                {isDeactivated ? 'Activate' : 'Deactivate'}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive" 
                                className="gap-2"
                                disabled={isActioning}
                                onClick={() => handleAdminDeleteProperty(p.id)}
                              >
                                {isActioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />} Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )})}
                  </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* ADMIN USERS TAB */}
          {user.role === 'admin' && (
            <TabsContent value="users" className="space-y-6">
              {/* User Profile Detail Dialog */}
              <Dialog open={!!selectedProfileUser} onOpenChange={(open) => { if (!open) setSelectedProfileUser(null); }}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <UserCircle className="h-5 w-5" /> User Profile
                    </DialogTitle>
                  </DialogHeader>
                  {selectedProfileUser && (() => {
                    const pu = selectedProfileUser;
                    const isPending = pu.status === 'pending';
                    const isBusy = !!userActionLoading[pu.id];
                    const puAvatar = pu.avatar?.startsWith("/objects/") ? `/api/storage${pu.avatar}` : pu.avatar ?? null;
                    const puIdFront = pu.idFront?.startsWith("/objects/") ? `/api/storage${pu.idFront}` : pu.idFront ?? null;
                    const puIdBack = pu.idBack?.startsWith("/objects/") ? `/api/storage${pu.idBack}` : pu.idBack ?? null;
                    const puIsRegisteredFirm = !!pu.isRegisteredFirm;
                    const puFirmType = pu.firmType as "business_name" | "registered_company" | undefined;
                    const puFirmCertReg = pu.firmCertRegistration?.startsWith("/objects/") ? `/api/storage${pu.firmCertRegistration}` : pu.firmCertRegistration ?? null;
                    const puFirmCertInc = pu.firmCertIncorporation?.startsWith("/objects/") ? `/api/storage${pu.firmCertIncorporation}` : pu.firmCertIncorporation ?? null;
                    const puFirmCr12 = pu.firmCr12?.startsWith("/objects/") ? `/api/storage${pu.firmCr12}` : pu.firmCr12 ?? null;
                    const puFirmDirectorIds: string[] = (pu.firmDirectorIds ?? []).map((p: string) => p.startsWith("/objects/") ? `/api/storage${p}` : p);
                    const puInitials = pu.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                    const statusColor =
                      pu.status === 'active' ? 'bg-green-50 text-gray-700 border-green-200' :
                      pu.status === 'suspended' ? 'bg-red-50 text-gray-700 border-red-200' :
                      'bg-amber-50 text-amber-700 border-amber-200';
                    return (
                      <div className="space-y-5 pt-2">
                        {/* Avatar + Basic Info */}
                        <div className="flex items-center gap-4">
                          <div className="h-16 w-16 rounded-full bg-zinc-800 flex items-center justify-center text-white font-semibold text-lg shrink-0 overflow-hidden">
                            {puAvatar
                              ? <img src={puAvatar} alt={pu.name} className="h-full w-full object-cover" />
                              : puInitials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-base">{pu.name}</p>
                            <p className="text-sm text-muted-foreground truncate">{pu.email}</p>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              <Badge variant="secondary" className="text-[10px] px-1.5 h-4 capitalize">{pu.role}</Badge>
                              <Badge variant="outline" className={`text-[10px] px-1.5 h-4 capitalize ${statusColor}`}>{pu.status}</Badge>
                            </div>
                          </div>
                        </div>

                        {/* Details grid */}
                        <div className="grid grid-cols-2 gap-3 text-sm border rounded-lg p-3 bg-gray-50">
                          <div>
                            <p className="text-xs text-muted-foreground">Phone</p>
                            <p className="font-medium mt-0.5 flex items-center gap-1">
                              {pu.phone || <span className="text-muted-foreground italic">Not set</span>}
                              {pu.phone && pu.phoneVerified && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-600 bg-gray-50 border border-gray-200 rounded-full px-1.5 py-0.5">
                                  <Check className="h-2.5 w-2.5" /> Verified
                                </span>
                              )}
                              {pu.phone && !pu.phoneVerified && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5">
                                  Unverified
                                </span>
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Joined</p>
                            <p className="font-medium mt-0.5">
                              {pu.joinDate ? new Date(pu.joinDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                            </p>
                          </div>
                          {(pu as any).businessName && (
                            <div className="col-span-2">
                              <p className="text-xs text-muted-foreground flex items-center gap-1"><Building className="h-3 w-3" /> Business / Brand Name</p>
                              <p className="font-medium mt-0.5">{(pu as any).businessName}</p>
                            </div>
                          )}
                        </div>

                        {/* Verification Documents — firm or individual */}
                        {puIsRegisteredFirm ? (
                          <div className="space-y-4">
                            <p className="text-sm font-semibold flex items-center gap-1.5">
                              <ShieldCheck className="h-4 w-4 text-gray-600" /> Business Documents
                              <span className="ml-1 text-[10px] font-normal bg-blue-50 text-gray-700 border border-gray-200 rounded-full px-2 py-0.5">
                                {puFirmType === "registered_company" ? "Registered Company" : "Business Name"}
                              </span>
                            </p>

                            {puFirmType === "business_name" && (
                              <div className="space-y-1.5">
                                <p className="text-xs font-medium text-gray-600">Certificate of Registration</p>
                                {puFirmCertReg ? (
                                  <div className="relative group border rounded-lg overflow-hidden">
                                    <img src={puFirmCertReg} alt="Certificate of Registration" className="w-full object-cover rounded-lg" style={{ maxHeight: 180 }} />
                                    <a
                                      href={puFirmCertReg}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="absolute top-2 right-2 bg-white/90 border rounded-md px-2 py-1 text-[10px] font-medium text-gray-700 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <ExternalLink className="h-3 w-3" /> Open
                                    </a>
                                  </div>
                                ) : (
                                  <div className="h-24 rounded-lg border bg-gray-50 flex items-center justify-center text-xs text-muted-foreground">Not uploaded</div>
                                )}
                              </div>
                            )}

                            {puFirmType === "registered_company" && (
                              <div className="space-y-4">
                                {/* Certificate of Incorporation */}
                                <div className="space-y-1.5">
                                  <p className="text-xs font-medium text-gray-600">Certificate of Incorporation</p>
                                  {puFirmCertInc ? (
                                    <div className="relative group border rounded-lg overflow-hidden">
                                      <img src={puFirmCertInc} alt="Certificate of Incorporation" className="w-full object-cover rounded-lg" style={{ maxHeight: 180 }} />
                                      <a
                                        href={puFirmCertInc}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="absolute top-2 right-2 bg-white/90 border rounded-md px-2 py-1 text-[10px] font-medium text-gray-700 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <ExternalLink className="h-3 w-3" /> Open
                                      </a>
                                    </div>
                                  ) : (
                                    <div className="h-24 rounded-lg border bg-gray-50 flex items-center justify-center text-xs text-muted-foreground">Not uploaded</div>
                                  )}
                                </div>

                                {/* CR12 */}
                                <div className="space-y-1.5">
                                  <p className="text-xs font-medium text-gray-600">CR12 Certificate</p>
                                  {puFirmCr12 ? (
                                    <div className="relative group border rounded-lg overflow-hidden">
                                      <img src={puFirmCr12} alt="CR12 Certificate" className="w-full object-cover rounded-lg" style={{ maxHeight: 180 }} />
                                      <a
                                        href={puFirmCr12}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="absolute top-2 right-2 bg-white/90 border rounded-md px-2 py-1 text-[10px] font-medium text-gray-700 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <ExternalLink className="h-3 w-3" /> Open
                                      </a>
                                    </div>
                                  ) : (
                                    <div className="h-24 rounded-lg border bg-gray-50 flex items-center justify-center text-xs text-muted-foreground">Not uploaded</div>
                                  )}
                                </div>

                                {/* Director IDs */}
                                <div className="space-y-1.5">
                                  <p className="text-xs font-medium text-gray-600">Director ID Documents ({puFirmDirectorIds.length})</p>
                                  {puFirmDirectorIds.length === 0 ? (
                                    <div className="h-20 rounded-lg border bg-gray-50 flex items-center justify-center text-xs text-muted-foreground">None uploaded</div>
                                  ) : (
                                    <div className="grid grid-cols-2 gap-2">
                                      {puFirmDirectorIds.map((src, idx) => (
                                        <div key={idx} className="relative group border rounded-lg overflow-hidden">
                                          <img src={src} alt={`Director ${idx + 1} ID`} className="w-full h-28 object-cover" />
                                          <div className="px-2 py-1 text-[10px] text-gray-600 font-medium bg-white border-t flex items-center justify-between">
                                            <span>Director {idx + 1}</span>
                                            <a href={src} target="_blank" rel="noopener noreferrer" className="text-gray-600 flex items-center gap-0.5">
                                              <ExternalLink className="h-2.5 w-2.5" /> Open
                                            </a>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {!puFirmType && (
                              <div className="text-center py-6 border rounded-lg bg-gray-50 text-muted-foreground text-sm">
                                Firm type not specified
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-sm font-semibold flex items-center gap-1.5">
                              <ShieldCheck className="h-4 w-4 text-gray-500" /> Identity Documents
                            </p>
                            {!puIdFront && !puIdBack ? (
                              <div className="text-center py-6 border rounded-lg bg-gray-50 text-muted-foreground text-sm">
                                No ID documents uploaded yet
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <p className="text-xs font-medium text-gray-600">Front Side</p>
                                  {puIdFront
                                    ? <img src={puIdFront} alt="ID Front" className="w-full rounded-lg border object-cover" style={{ maxHeight: 160 }} />
                                    : <div className="h-28 rounded-lg border bg-gray-50 flex items-center justify-center text-xs text-muted-foreground">Not uploaded</div>}
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs font-medium text-gray-600">Back Side</p>
                                  {puIdBack
                                    ? <img src={puIdBack} alt="ID Back" className="w-full rounded-lg border object-cover" style={{ maxHeight: 160 }} />
                                    : <div className="h-28 rounded-lg border bg-gray-50 flex items-center justify-center text-xs text-muted-foreground">Not uploaded</div>}
                                </div>
                              </div>
                            )}
                            {(puIdFront || puIdBack) && !(puIdFront && puIdBack) && (
                              <p className="text-xs text-amber-600 flex items-center gap-1">⚠ Only one side uploaded — verification incomplete</p>
                            )}
                            {puIdFront && puIdBack && (
                              <p className="text-xs text-gray-600 flex items-center gap-1"><Check className="h-3 w-3" /> Both sides submitted</p>
                            )}
                          </div>
                        )}

                        {/* ── Listed Properties ── */}
                        <div className="space-y-2 pt-1 border-t mt-2">
                          <p className="text-sm font-semibold flex items-center gap-1.5 pt-2">
                            <Building className="h-4 w-4 text-gray-500" /> Listed Properties
                            {!loadingProfileUserProperties && (
                              <span className="text-[10px] font-normal bg-muted text-muted-foreground rounded-full px-2 py-0.5">
                                {profileUserProperties.length}
                              </span>
                            )}
                          </p>
                          {loadingProfileUserProperties ? (
                            <div className="flex items-center justify-center py-6">
                              <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            </div>
                          ) : profileUserProperties.length === 0 ? (
                            <div className="text-center py-5 border rounded-lg bg-gray-50 text-muted-foreground text-sm">
                              No properties listed yet
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {profileUserProperties.map((prop: any) => {
                                const thumb = prop.images?.[0]?.startsWith("/objects/")
                                  ? `/api/storage${prop.images[0]}`
                                  : prop.images?.[0] ?? null;
                                const propStatus = prop.propertyStatus ?? prop.status ?? "unknown";
                                const statusCls =
                                  propStatus === "available" ? "bg-green-50 text-green-700 border-green-200" :
                                  propStatus === "sold" || propStatus === "rented" ? "bg-blue-50 text-blue-700 border-blue-200" :
                                  "bg-amber-50 text-amber-700 border-amber-200";
                                return (
                                  <div key={prop.id} className="flex items-center gap-3 p-2.5 rounded-lg border hover:bg-muted/30 transition-colors">
                                    <div className="h-12 w-16 rounded-md bg-gray-100 shrink-0 overflow-hidden">
                                      {thumb
                                        ? <img src={thumb} alt={prop.title} className="h-full w-full object-cover" />
                                        : <div className="h-full w-full flex items-center justify-center"><Building className="h-4 w-4 text-muted-foreground opacity-40" /></div>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{prop.title}</p>
                                      <p className="text-xs text-muted-foreground truncate">{prop.address || "No address"}</p>
                                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                        <span className="text-[10px] bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 capitalize">{prop.type}</span>
                                        <Badge variant="outline" className={`text-[10px] px-1.5 h-4 capitalize ${statusCls}`}>{propStatus}</Badge>
                                        {prop.price && (
                                          <span className="text-[10px] font-semibold text-primary">
                                            KES {Number(prop.price).toLocaleString()}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                  {selectedProfileUser?.status === 'pending' && (
                    <DialogFooter className="pt-4 border-t mt-4">
                      <div className="flex gap-2 w-full">
                        <Button
                          variant="destructive"
                          className="flex-1 gap-2"
                          disabled={!!userActionLoading[selectedProfileUser.id]}
                          onClick={async () => {
                            await handleUserStatusUpdate(selectedProfileUser.id, 'suspended');
                            setSelectedProfileUser(null);
                          }}
                        >
                          {userActionLoading[selectedProfileUser.id]
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <X className="h-4 w-4" />}
                          Reject / Suspend
                        </Button>
                        <Button
                          className="flex-1 gap-2 bg-gray-900 hover:bg-gray-800 text-white"
                          disabled={!!userActionLoading[selectedProfileUser.id]}
                          onClick={async () => {
                            await handleUserStatusUpdate(selectedProfileUser.id, 'active');
                            setSelectedProfileUser(null);
                          }}
                        >
                          {userActionLoading[selectedProfileUser.id]
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Check className="h-4 w-4" />}
                          Approve
                        </Button>
                      </div>
                    </DialogFooter>
                  )}
                </DialogContent>
              </Dialog>

              {/* Pending users alert banner */}
              {pendingUsers.length > 0 && (
                <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                  <p className="text-sm text-amber-800 font-medium">
                    {pendingUsers.length} user{pendingUsers.length > 1 ? 's' : ''} pending verification
                  </p>
                </div>
              )}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" /> All Users
                        {!isLoadingAdminUsers && (
                          <Badge variant="secondary" className="ml-2">{adminUsers.length}</Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">Browse and manage user accounts across the platform</CardDescription>
                    </div>
                    <Button
                      size="sm"
                      className="gap-1.5 shrink-0"
                      onClick={() => { setCreateUserForm({ name: "", email: "", password: "", role: "tenant" }); setCreateUserDialog(true); }}
                    >
                      <Plus className="h-4 w-4" /> Create User
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Search + Filter bar */}
                  {!isLoadingAdminUsers && adminUsers.length > 0 && (
                    <div className="flex flex-col sm:flex-row gap-2 mb-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                          type="text"
                          value={userSearch}
                          onChange={e => setUserSearch(e.target.value)}
                          placeholder="Search by name or email…"
                          className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-800 bg-gray-50"
                        />
                      </div>
                      <select
                        value={userRoleFilter}
                        onChange={e => setUserRoleFilter(e.target.value)}
                        className="text-sm border rounded-lg px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-zinc-800 sm:w-36"
                      >
                        <option value="all">All Roles</option>
                        <option value="owner">Owner</option>
                        <option value="host">Host</option>
                        <option value="tenant">Tenant</option>
                        <option value="admin">Admin</option>
                      </select>
                      <select
                        value={userStatusFilter}
                        onChange={e => setUserStatusFilter(e.target.value)}
                        className="text-sm border rounded-lg px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-zinc-800 sm:w-36"
                      >
                        <option value="all">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="pending">Pending</option>
                      </select>
                      <div className="relative sm:w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input type="text" value={userLocationSearch} onChange={e => setUserLocationSearch(e.target.value)} placeholder="Filter by location…" className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-800 bg-gray-50" />
                      </div>
                      {(userSearch || userRoleFilter !== "all" || userStatusFilter !== "all" || userLocationSearch) && (
                        <button
                          onClick={() => { setUserSearch(""); setUserRoleFilter("all"); setUserStatusFilter("all"); setUserLocationSearch(""); }}
                          className="text-xs text-muted-foreground hover:text-foreground underline px-1 shrink-0"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  )}
                  {isLoadingAdminUsers ? (
                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading users...
                    </div>
                  ) : adminUsers.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground bg-gray-50 rounded-lg border border-dashed">
                      <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p className="font-medium">No users found</p>
                    </div>
                  ) : adminUsers.filter((u: any) => {
                    if (userSearch) {
                      const q = userSearch.toLowerCase();
                      if (!(u.name || "").toLowerCase().includes(q) && !(u.email || "").toLowerCase().includes(q)) return false;
                    }
                    if (userRoleFilter !== "all" && u.role !== userRoleFilter) return false;
                    if (userStatusFilter !== "all" && u.status !== userStatusFilter) return false;
                        if (userLocationSearch) { const q = userLocationSearch.toLowerCase(); if (!(u.address || "").toLowerCase().includes(q) && !(u.city || "").toLowerCase().includes(q) && !(u.email || "").toLowerCase().includes(q)) {} else {} if (!((u.address||"").toLowerCase().includes(q)||(u.city||"").toLowerCase().includes(q))) return false; }
                    return true;
                  }).length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground bg-gray-50 rounded-lg border border-dashed">
                      <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p className="font-medium">No users match your filters</p>
                      <p className="text-xs mt-1">Try adjusting the search or filters above</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {adminUsers.filter((u: any) => {
                        if (userSearch) {
                          const q = userSearch.toLowerCase();
                          if (!(u.name || "").toLowerCase().includes(q) && !(u.email || "").toLowerCase().includes(q)) return false;
                        }
                        if (userRoleFilter !== "all" && u.role !== userRoleFilter) return false;
                        if (userStatusFilter !== "all" && u.status !== userStatusFilter) return false;
                          if (userLocationSearch) { const q2 = userLocationSearch.toLowerCase(); if (!((u.address||"").toLowerCase().includes(q2)||(u.city||"").toLowerCase().includes(q2))) return false; }
                        return true;
                      }).sort((a: any, b: any) => new Date(b.joinDate ?? 0).getTime() - new Date(a.joinDate ?? 0).getTime()).map((u: any) => {
                        const initials = u.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                        const statusColor =
                          u.status === 'active' ? 'bg-green-50 text-gray-700 border-green-200' :
                          u.status === 'suspended' ? 'bg-red-50 text-gray-700 border-red-200' :
                          'bg-amber-50 text-amber-700 border-amber-200';
                        const isBusy = !!userActionLoading[u.id];
                        const isSelf = u.id === user.id;
                        const avatarSrc = u.avatar?.startsWith("/objects/") ? `/api/storage${u.avatar}` : u.avatar ?? null;
                        const hasId = u.idFront || u.idBack;
                        return (
                          <div key={u.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border rounded-lg bg-white shadow-sm hover:bg-gray-50 transition-colors">
                            <div className="h-10 w-10 rounded-full bg-zinc-700 flex items-center justify-center text-white font-semibold text-sm shrink-0 overflow-hidden">
                              {avatarSrc
                                ? <img src={avatarSrc} alt={u.name} className="h-full w-full object-cover rounded-full" />
                                : initials}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-sm truncate">{u.name}</span>
                                {isSelf && <Badge variant="outline" className="text-[10px] px-1.5 h-4">You</Badge>}
                                {hasId && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-600 bg-blue-50 border border-gray-200 rounded-full px-1.5 py-0.5">
                                    <ShieldCheck className="h-2.5 w-2.5" /> ID on file
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                <Badge variant="secondary" className="text-[10px] px-1.5 h-4 capitalize">{u.role}</Badge>
                                {u.isRegisteredFirm && (
                                  <span
                                    title={u.firmType === "registered_company" ? "Registered Company" : "Business Name"}
                                    className="inline-flex items-center gap-0.5 text-[10px] font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-full px-1.5 py-0.5 cursor-default"
                                  >
                                    <ShieldCheck className="h-2.5 w-2.5" /> Firm
                                  </span>
                                )}
                                <Badge variant="outline" className={`text-[10px] px-1.5 h-4 capitalize ${statusColor}`}>{u.status}</Badge>
                                {u.joinDate && (
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                    Joined {new Date(u.joinDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                              <Button size="sm" variant="outline" className="gap-1" onClick={() => setSelectedProfileUser(u)}>
                                <Eye className="h-3 w-3" /> View Profile
                              </Button>
                              <Button size="sm" variant="outline" className="gap-1 text-zinc-700 border-zinc-300 hover:bg-zinc-50"
                                onClick={() => { setAssignSubDialog({ userId: u.id, userName: u.name }); setAssignPlan("basic"); setAssignMonths(1); }}>
                                <Crown className="h-3 w-3" /> Assign Plan
                              </Button>
                              {!isSelf && u.status !== 'suspended' ? (
                                <Button size="sm" variant="outline" className="text-gray-600 hover:text-gray-700 hover:bg-red-50 border-red-200"
                                  disabled={isBusy} onClick={() => handleUserStatusUpdate(u.id, 'suspended')}>
                                  {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3 mr-1" />}
                                  Suspend
                                </Button>
                              ) : !isSelf && (
                                <Button size="sm" variant="outline" className="text-gray-600 hover:text-gray-700 hover:bg-green-50 border-green-200"
                                  disabled={isBusy} onClick={() => handleUserStatusUpdate(u.id, 'active')}>
                                  {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                                  Reactivate
                                </Button>
                              )}
                              {!isSelf && u.role !== 'admin' && (
                                <Button size="sm" variant="outline" className="gap-1 text-amber-700 border-amber-300 hover:bg-amber-50"
                                  onClick={() => { setResetPasswordValue(""); setResetPasswordDialog({ userId: u.id, userName: u.name }); }}>
                                  <Lock className="h-3 w-3" /> Reset Password
                                </Button>
                              )}
                              {!isSelf && u.role !== 'admin' && (
                                <Button size="sm" variant="outline" className="text-gray-700 hover:text-red-800 hover:bg-red-50 border-red-300"
                                  disabled={isBusy} onClick={() => setDeleteUserId(u.id)}>
                                  <Trash2 className="h-3 w-3 mr-1" /> Delete
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Create User Dialog */}
          <Dialog open={createUserDialog} onOpenChange={open => { if (!open) setCreateUserDialog(false); }}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" /> Create User
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Full Name</label>
                  <input
                    className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    placeholder="e.g. Jane Mwangi"
                    value={createUserForm.name}
                    onChange={e => setCreateUserForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Email Address</label>
                  <input
                    type="email"
                    className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    placeholder="jane@example.com"
                    value={createUserForm.email}
                    onChange={e => setCreateUserForm(f => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    placeholder="Minimum 6 characters"
                    value={createUserForm.password}
                    onChange={e => setCreateUserForm(f => ({ ...f, password: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Role</label>
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white capitalize"
                    value={createUserForm.role}
                    onChange={e => setCreateUserForm(f => ({ ...f, role: e.target.value }))}
                  >
                    <option value="tenant">Tenant</option>
                    <option value="owner">Owner</option>
                    <option value="host">Host</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setCreateUserDialog(false)} disabled={isCreatingUser}>
                  Cancel
                </Button>
                <Button onClick={handleCreateUser} disabled={isCreatingUser} className="gap-1">
                  {isCreatingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Create User
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Reset Password Dialog */}
          <Dialog open={!!resetPasswordDialog} onOpenChange={open => { if (!open) { setResetPasswordDialog(null); setResetPasswordValue(""); } }}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-amber-600" /> Reset Password
                </DialogTitle>
                <DialogDescription>
                  Set a new password for <span className="font-semibold text-gray-900">{resetPasswordDialog?.userName}</span>. They will need to use this password to sign in.
                </DialogDescription>
              </DialogHeader>
              <div className="py-2 space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="admin-new-password">New Password</Label>
                  <Input
                    id="admin-new-password"
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={resetPasswordValue}
                    onChange={e => setResetPasswordValue(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleResetPassword()}
                    autoFocus
                  />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => { setResetPasswordDialog(null); setResetPasswordValue(""); }} disabled={resetPasswordLoading}>
                  Cancel
                </Button>
                <Button onClick={handleResetPassword} disabled={resetPasswordLoading || resetPasswordValue.length < 6} className="gap-1 bg-amber-600 hover:bg-amber-700">
                  {resetPasswordLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  Set Password
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete User Confirmation Dialog */}
          <Dialog open={!!deleteUserId} onOpenChange={open => { if (!open) setDeleteUserId(null); }}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-gray-700">
                  <Trash2 className="h-5 w-5" /> Permanently Delete User
                </DialogTitle>
              </DialogHeader>
              <div className="py-2 text-sm text-muted-foreground space-y-2">
                <p>This will <span className="font-semibold text-gray-900">permanently delete</span> this user along with all their:</p>
                <ul className="list-disc list-inside space-y-0.5 text-xs pl-1">
                  <li>Properties and listings</li>
                  <li>Bookings and reservations</li>
                  <li>Subscriptions</li>
                  <li>Notifications and saved properties</li>
                </ul>
                <p className="text-gray-600 font-medium pt-1">This action cannot be undone.</p>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setDeleteUserId(null)} disabled={isDeletingUser}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteUser}
                  disabled={isDeletingUser}
                  className="gap-1"
                >
                  {isDeletingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Delete Permanently
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* NOTIFICATION TEMPLATES TAB (Admin only) */}
          <TabsContent value="notif-templates" className="flex flex-col" style={{ minHeight: "70vh" }}>
            <NotificationTemplatesPanel token={token} />
          </TabsContent>

          {/* ADMIN MARKETING TAB */}
          {user.role === 'admin' && (
            <TabsContent value="admin-marketing" className="space-y-6">
              <AdminMarketingDashboard token={token} />
            </TabsContent>
          )}

          {/* MARKETER DASHBOARD TAB */}
          {isMarketer && (
            <TabsContent value="my-marketing" className="space-y-6">
              <MarketerDashboard token={token} />
            </TabsContent>
          )}

          {/* SETTINGS TAB (Shared) */}
          <TabsContent value="settings" className="space-y-6">
            
            {/* Profile Completion Header */}
            <div className="bg-white border rounded-xl shadow-sm p-6 mb-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-16 w-16 rounded-full bg-zinc-900 flex items-center justify-center text-white text-2xl font-bold shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
                  <p className="text-gray-500 capitalize">{user.role}</p>
                </div>
              </div>
              
              {(() => {
                const steps = [
                  { label: "Name",       done: !!user.name },
                  { label: "Email",      done: !!user.email },
                  { label: "Phone",      done: !!user.phone },
                  { label: "Photo",      done: !!user.avatar },
                  { label: "ID front",   done: !!user.idFront },
                  { label: "ID back",    done: !!user.idBack },
                ];
                const pct = Math.round((steps.filter(s => s.done).length / steps.length) * 100);
                const missing = steps.filter(s => !s.done).map(s => s.label);
                return (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-gray-600">Profile completion:</span>
                      <span className={pct === 100 ? "text-gray-600" : "text-gray-700"}>{pct}%</span>
                    </div>
                    <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pct === 100 ? "bg-gray-700" : "bg-zinc-900"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {pct < 100 && missing.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Missing: {missing.join(", ")}
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>

            <ProfileCard user={user} token={token} refreshUser={refreshUser} />

            <Card>
              <CardHeader className="bg-gray-50/50 border-b pb-4 mb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Lock className="h-5 w-5 text-gray-500" /> Change Password
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2 max-w-md">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input id="current-password" type="password" placeholder="Enter current password" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input id="new-password" type="password" placeholder="At least 8 characters" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input id="confirm-password" type="password" placeholder="Repeat new password" />
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="mt-2 font-medium" 
                  onClick={() => toast({ title: "Password Updated", description: "Your password has been changed successfully.", className: "bg-gray-50 border-gray-200 text-gray-800" })}
                >
                  Change Password
                </Button>
              </CardContent>
            </Card>

            {/* Notifications Card */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-medium mb-4">Notifications</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email-notif" className="flex flex-col gap-1 cursor-pointer">
                      <span>Email Notifications</span>
                      <span className="font-normal text-xs text-muted-foreground">Receive updates about your listings and messages</span>
                    </Label>
                    <Input type="checkbox" id="email-notif" className="h-4 w-4 accent-primary" defaultChecked />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Admin: Subscription Management Tab ─────────────────── */}
          {user.role === 'admin' && (
            <TabsContent value="admin-subscriptions" className="space-y-6 mt-0">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">Subscription Management</h1>
                  <p className="text-gray-500 text-sm">View, assign, and manage all user subscription plans</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={fetchAdminSubscriptions} disabled={isLoadingAdminSubs} className="gap-2">
                    <RefreshCw className={`h-4 w-4 ${isLoadingAdminSubs ? 'animate-spin' : ''}`} /> Refresh
                  </Button>
                </div>
              </div>

              {/* Stats cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Total", value: adminSubscriptions.length, color: "text-gray-900" },
                  { label: "Active", value: adminSubscriptions.filter(s => s.status === 'active').length, color: "text-gray-600" },
                  { label: "Basic", value: adminSubscriptions.filter(s => s.plan === 'basic' && s.status === 'active').length, color: "text-zinc-500" },
                  { label: "Pro", value: adminSubscriptions.filter(s => s.plan === 'pro' && s.status === 'active').length, color: "text-gray-500" },
                ].map(stat => (
                  <Card key={stat.label}>
                    <CardContent className="py-4 text-center">
                      <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                      <div className="text-xs text-gray-500 mt-1">{stat.label} Subscriptions</div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Subscriptions table */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">All Subscriptions</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {isLoadingAdminSubs ? (
                    <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-zinc-400" /></div>
                  ) : adminSubscriptions.length === 0 ? (
                    <div className="py-12 text-center text-gray-400">No subscriptions yet</div>
                  ) : (() => {
                    const subsQ = subsSearch.toLowerCase();
                    const filteredSubs = adminSubscriptions
                      .filter(s => !subsSearch || (s.userName ?? "").toLowerCase().includes(subsQ) || (s.userEmail ?? "").toLowerCase().includes(subsQ) || (s.plan ?? "").toLowerCase().includes(subsQ))
                      .sort((a, b) => new Date(b.startDate ?? 0).getTime() - new Date(a.startDate ?? 0).getTime());
                    return (
                    <div>
                      {/* Subscription search */}
                      <div className="px-4 py-3 border-b bg-gray-50">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <input type="text" value={subsSearch} onChange={e => setSubsSearch(e.target.value)} placeholder="Search by name, email or plan…" className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-800 bg-white" />
                        </div>
                      </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold text-gray-600">User</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-600">Plan</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-600">Period</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-600">Paid</th>
                            <th className="px-4 py-3 text-right font-semibold text-gray-600">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredSubs.length === 0 ? (
                            <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">No subscriptions match your search</td></tr>
                          ) : filteredSubs.map((sub: any) => (
                            <tr key={sub.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <div className="font-medium text-gray-900">{sub.userName ?? "—"}</div>
                                <div className="text-xs text-gray-400">{sub.userEmail ?? ""}</div>
                              </td>
                              <td className="px-4 py-3">
                                <Badge className={sub.plan === 'enterprise' ? 'bg-gray-100 text-gray-800 border-gray-300' : sub.plan === 'pro' ? 'bg-gray-100 text-gray-800 border-gray-200' : sub.plan === 'basic' ? 'bg-zinc-200 text-zinc-700' : 'bg-gray-100 text-gray-600'} style={{ textTransform: 'capitalize' }}>
                                  {sub.plan}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant={sub.status === 'active' ? 'default' : 'secondary'} className={sub.status === 'active' ? 'bg-gray-100 text-gray-800 border-gray-200' : 'bg-gray-100 text-gray-600 border-gray-200'}>
                                  {sub.status}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-500">
                                <div>{sub.startDate} →</div>
                                <div>{sub.endDate === '9999-12-31' ? 'No expiry' : sub.endDate}</div>
                              </td>
                              <td className="px-4 py-3 text-gray-700 font-medium">
                                {sub.amountPaid > 0 ? `KES ${sub.amountPaid.toLocaleString()}` : 'Free'}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="sm" variant="outline"
                                    className="text-xs h-7 px-2"
                                    onClick={() => setAssignSubDialog({ userId: sub.userId, userName: sub.userName ?? sub.userEmail ?? "User" })}
                                  >
                                    Reassign
                                  </Button>
                                  {sub.status === 'active' && (
                                    <Button
                                      size="sm" variant="outline"
                                      className="text-xs h-7 px-2 text-gray-600 border-red-200 hover:bg-red-50"
                                      onClick={async () => {
                                        if (!token) return;
                                        const r = await fetch(`/api/admin/subscriptions/${sub.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
                                        if (r.ok) { await fetchAdminSubscriptions(); toast({ title: "Subscription cancelled" }); }
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* ── Plan Packages Editor ─────────────────────────────── */}
              <div className="mt-2">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Subscription Packages</h2>
                    <p className="text-sm text-gray-500">Edit plan prices, listing limits, and features</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchAdminPlans} className="gap-2">
                      <RefreshCw className="h-4 w-4" /> Refresh
                    </Button>
                    <Button size="sm" className="bg-zinc-900 hover:bg-zinc-800 text-white gap-2" onClick={() => {
                      setCreatePlanForm({ name: "", displayName: "", pricePerMonth: 0, listingLimit: 3, features: [], isActive: true });
                      setCreatePlanFeature("");
                      setCreatePlanDialog(true);
                    }}>
                      <Plus className="h-4 w-4" /> Create Package
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {adminPlans.map((plan: any) => (
                    <Card key={plan.name} className={`relative border-2 ${plan.name === 'enterprise' ? 'border-purple-300' : plan.name === 'pro' ? 'border-yellow-300' : plan.name === 'basic' ? 'border-zinc-300' : 'border-gray-200'}`}>
                      <CardContent className="py-5 px-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {plan.name === 'enterprise' && <Crown className="h-5 w-5 text-gray-500" />}
                            {plan.name === 'pro' && <Crown className="h-5 w-5 text-gray-500" />}
                            {plan.name === 'basic' && <Zap className="h-5 w-5 text-zinc-500" />}
                            {plan.name === 'free' && <Gift className="h-5 w-5 text-gray-400" />}
                            {!['enterprise','pro','basic','free'].includes(plan.name) && <Settings className="h-5 w-5 text-gray-400" />}
                            <span className="font-bold text-base capitalize">{plan.displayName}</span>
                          </div>
                          {!plan.isActive && <Badge className="bg-red-100 text-gray-700 text-xs">Disabled</Badge>}
                        </div>
                        <div className="text-2xl font-bold text-gray-900 mb-1">
                          {plan.pricePerMonth === 0 ? 'Free' : `KES ${plan.pricePerMonth?.toLocaleString()}`}
                          {plan.pricePerMonth > 0 && <span className="text-sm font-normal text-gray-400">/mo</span>}
                        </div>
                        <div className="text-sm text-gray-500 mb-3">
                          {plan.listingLimit >= 2147483646 ? 'Unlimited listings' : `Up to ${plan.listingLimit} listings`}
                        </div>
                        <div className="space-y-1 mb-4">
                          {(plan.features ?? []).map((f: string, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                              <Check className="h-3 w-3 text-gray-500 shrink-0" /> {f}
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 gap-2"
                            onClick={() => {
                              setEditingPlan(plan);
                              setPlanForm({
                                displayName: plan.displayName,
                                pricePerMonth: plan.pricePerMonth,
                                listingLimit: plan.listingLimit >= 2147483646 ? 999999 : plan.listingLimit,
                                features: plan.features ?? [],
                                isActive: plan.isActive,
                              });
                            }}
                          >
                            <Edit className="h-3.5 w-3.5" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-gray-500 hover:text-gray-700 hover:bg-red-50 border-red-200 px-2"
                            onClick={() => setDeletingPlanName(plan.name)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Plan edit dialog */}
              <Dialog open={!!editingPlan} onOpenChange={(open) => { if (!open) { setEditingPlan(null); setNewFeature(""); } }}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 capitalize">
                      {editingPlan?.name === 'enterprise' && <Crown className="h-5 w-5 text-gray-500" />}
                      {editingPlan?.name === 'pro' && <Crown className="h-5 w-5 text-gray-500" />}
                      {editingPlan?.name === 'basic' && <Zap className="h-5 w-5 text-zinc-500" />}
                      {editingPlan?.name === 'free' && <Gift className="h-5 w-5 text-gray-400" />}
                      Edit {editingPlan?.name} Package
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold">Display Name</label>
                      <input
                        type="text"
                        value={planForm.displayName}
                        onChange={e => setPlanForm(f => ({ ...f, displayName: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-800"
                      />
                    </div>
                    {editingPlan?.name !== 'free' && (
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold">Price per Month (KES)</label>
                        <input
                          type="number"
                          min={0}
                          step={50}
                          value={planForm.pricePerMonth}
                          onChange={e => setPlanForm(f => ({ ...f, pricePerMonth: Number(e.target.value) }))}
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-800"
                        />
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold">
                        Listing Limit
                        {planForm.listingLimit >= 999999 && <span className="ml-2 text-xs font-normal text-gray-600">(Unlimited)</span>}
                      </label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          min={1}
                          max={999999}
                          value={planForm.listingLimit}
                          onChange={e => setPlanForm(f => ({ ...f, listingLimit: Number(e.target.value) }))}
                          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-800"
                        />
                        {(editingPlan?.name === 'pro' || editingPlan?.name === 'enterprise') && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setPlanForm(f => ({ ...f, listingLimit: 999999 }))}
                            className="text-xs whitespace-nowrap"
                          >
                            Set Unlimited
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold">Features</label>
                      <div className="space-y-1.5">
                        {planForm.features.map((feat: string, i: number) => (
                          <div key={i} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={feat}
                              onChange={e => setPlanForm(f => {
                                const feats = [...f.features];
                                feats[i] = e.target.value;
                                return { ...f, features: feats };
                              })}
                              className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-800"
                            />
                            <button
                              onClick={() => setPlanForm(f => ({ ...f, features: f.features.filter((_: string, j: number) => j !== i) }))}
                              className="text-red-400 hover:text-gray-600 shrink-0"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newFeature}
                            onChange={e => setNewFeature(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && newFeature.trim()) {
                                setPlanForm(f => ({ ...f, features: [...f.features, newFeature.trim()] }));
                                setNewFeature("");
                              }
                            }}
                            placeholder="Add a feature… (press Enter)"
                            className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-800 border-dashed"
                          />
                          <Button
                            size="sm" variant="outline"
                            onClick={() => {
                              if (newFeature.trim()) {
                                setPlanForm(f => ({ ...f, features: [...f.features, newFeature.trim()] }));
                                setNewFeature("");
                              }
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setPlanForm(f => ({ ...f, isActive: !f.isActive }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${planForm.isActive ? 'bg-zinc-900' : 'bg-gray-300'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${planForm.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                      <label className="text-sm font-medium">{planForm.isActive ? 'Active (visible to users)' : 'Disabled (hidden from users)'}</label>
                    </div>
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => { setEditingPlan(null); setNewFeature(""); }}>Cancel</Button>
                    <Button
                      className="bg-zinc-900 hover:bg-zinc-800 text-white gap-2"
                      disabled={isSavingPlan || !planForm.displayName.trim()}
                      onClick={async () => {
                        if (!editingPlan || !token) return;
                        setIsSavingPlan(true);
                        try {
                          const payload = {
                            displayName: planForm.displayName,
                            pricePerMonth: planForm.pricePerMonth,
                            listingLimit: planForm.listingLimit >= 999999 ? 2147483647 : planForm.listingLimit,
                            features: planForm.features.filter((f: string) => f.trim()),
                            isActive: planForm.isActive,
                          };
                          const r = await fetch(`/api/admin/plans/${editingPlan.name}`, {
                            method: "PUT",
                            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                            body: JSON.stringify(payload),
                          });
                          if (r.ok) {
                            await fetchAdminPlans();
                            setEditingPlan(null);
                            setNewFeature("");
                            toast({ title: "Package updated", description: `${planForm.displayName} plan saved successfully.`, className: "bg-gray-50 border-gray-200 text-gray-800" });
                          } else {
                            const d = await r.json();
                            toast({ title: "Save failed", description: d.error, variant: "destructive" });
                          }
                        } finally { setIsSavingPlan(false); }
                      }}
                    >
                      {isSavingPlan ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Save Package
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Create Package dialog */}
              <Dialog open={createPlanDialog} onOpenChange={(open) => { if (!open) { setCreatePlanDialog(false); setCreatePlanFeature(""); } }}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Plus className="h-5 w-5" /> Create New Package
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold">Plan ID <span className="text-gray-400 font-normal">(lowercase, no spaces)</span></label>
                      <input
                        type="text"
                        value={createPlanForm.name}
                        onChange={e => setCreatePlanForm(f => ({ ...f, name: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") }))}
                        placeholder="e.g. premium"
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-800"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold">Display Name</label>
                      <input
                        type="text"
                        value={createPlanForm.displayName}
                        onChange={e => setCreatePlanForm(f => ({ ...f, displayName: e.target.value }))}
                        placeholder="e.g. Premium"
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-800"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold">Price per Month (KES)</label>
                      <input
                        type="number"
                        min={0}
                        step={50}
                        value={createPlanForm.pricePerMonth}
                        onChange={e => setCreatePlanForm(f => ({ ...f, pricePerMonth: Number(e.target.value) }))}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-800"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold">
                        Listing Limit
                        {createPlanForm.listingLimit >= 999999 && <span className="ml-2 text-xs font-normal text-gray-600">(Unlimited)</span>}
                      </label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          min={1}
                          max={999999}
                          value={createPlanForm.listingLimit}
                          onChange={e => setCreatePlanForm(f => ({ ...f, listingLimit: Number(e.target.value) }))}
                          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-800"
                        />
                        <Button type="button" size="sm" variant="outline" onClick={() => setCreatePlanForm(f => ({ ...f, listingLimit: 999999 }))} className="text-xs whitespace-nowrap">
                          Set Unlimited
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold">Features</label>
                      <div className="space-y-1.5">
                        {createPlanForm.features.map((feat: string, i: number) => (
                          <div key={i} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={feat}
                              onChange={e => setCreatePlanForm(f => {
                                const feats = [...f.features];
                                feats[i] = e.target.value;
                                return { ...f, features: feats };
                              })}
                              className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-800"
                            />
                            <button onClick={() => setCreatePlanForm(f => ({ ...f, features: f.features.filter((_: string, j: number) => j !== i) }))} className="text-red-400 hover:text-gray-600 shrink-0">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={createPlanFeature}
                            onChange={e => setCreatePlanFeature(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && createPlanFeature.trim()) {
                                setCreatePlanForm(f => ({ ...f, features: [...f.features, createPlanFeature.trim()] }));
                                setCreatePlanFeature("");
                              }
                            }}
                            placeholder="Add a feature… (press Enter)"
                            className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-800 border-dashed"
                          />
                          <Button size="sm" variant="outline" onClick={() => {
                            if (createPlanFeature.trim()) {
                              setCreatePlanForm(f => ({ ...f, features: [...f.features, createPlanFeature.trim()] }));
                              setCreatePlanFeature("");
                            }
                          }}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setCreatePlanForm(f => ({ ...f, isActive: !f.isActive }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${createPlanForm.isActive ? 'bg-zinc-900' : 'bg-gray-300'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${createPlanForm.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                      <label className="text-sm font-medium">{createPlanForm.isActive ? 'Active (visible to users)' : 'Disabled (hidden from users)'}</label>
                    </div>
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => { setCreatePlanDialog(false); setCreatePlanFeature(""); }}>Cancel</Button>
                    <Button
                      className="bg-zinc-900 hover:bg-zinc-800 text-white gap-2"
                      disabled={isCreatingPlan || !createPlanForm.name.trim() || !createPlanForm.displayName.trim()}
                      onClick={async () => {
                        if (!token) return;
                        setIsCreatingPlan(true);
                        try {
                          const payload = {
                            name: createPlanForm.name,
                            displayName: createPlanForm.displayName,
                            pricePerMonth: createPlanForm.pricePerMonth,
                            listingLimit: createPlanForm.listingLimit >= 999999 ? 2147483647 : createPlanForm.listingLimit,
                            features: createPlanForm.features.filter((f: string) => f.trim()),
                            isActive: createPlanForm.isActive,
                          };
                          const r = await fetch("/api/admin/plans", {
                            method: "POST",
                            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                            body: JSON.stringify(payload),
                          });
                          if (r.ok) {
                            await fetchAdminPlans();
                            setCreatePlanDialog(false);
                            setCreatePlanFeature("");
                            toast({ title: "Package created", description: `${createPlanForm.displayName} plan created successfully.`, className: "bg-gray-50 border-gray-200 text-gray-800" });
                          } else {
                            const d = await r.json();
                            toast({ title: "Create failed", description: d.error, variant: "destructive" });
                          }
                        } finally { setIsCreatingPlan(false); }
                      }}
                    >
                      {isCreatingPlan ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Create Package
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Delete plan confirmation dialog */}
              <Dialog open={!!deletingPlanName} onOpenChange={(open) => { if (!open) setDeletingPlanName(null); }}>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-gray-600">
                      <Trash2 className="h-5 w-5" /> Delete Package
                    </DialogTitle>
                  </DialogHeader>
                  <div className="py-2">
                    <p className="text-sm text-gray-700">
                      Are you sure you want to delete the <span className="font-semibold capitalize">{adminPlans.find(p => p.name === deletingPlanName)?.displayName ?? deletingPlanName}</span> package?
                    </p>
                    <p className="text-xs text-gray-500 mt-2">This action cannot be undone. Existing user subscriptions will not be automatically updated.</p>
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setDeletingPlanName(null)}>Cancel</Button>
                    <Button
                      className="bg-gray-900 hover:bg-gray-800 text-white gap-2"
                      disabled={isDeletingPlan}
                      onClick={async () => {
                        if (!deletingPlanName || !token) return;
                        setIsDeletingPlan(true);
                        try {
                          const r = await fetch(`/api/admin/plans/${deletingPlanName}`, {
                            method: "DELETE",
                            headers: { Authorization: `Bearer ${token}` },
                          });
                          if (r.ok) {
                            await fetchAdminPlans();
                            setDeletingPlanName(null);
                            toast({ title: "Package deleted", description: "The plan has been removed.", className: "bg-gray-50 border-gray-200 text-gray-800" });
                          } else {
                            const d = await r.json();
                            toast({ title: "Delete failed", description: d.error, variant: "destructive" });
                          }
                        } finally { setIsDeletingPlan(false); }
                      }}
                    >
                      {isDeletingPlan ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      Delete
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>


            </TabsContent>
          )}

          {/* ── Admin: Payment Settings Tab ─────────────────────────── */}
          {user.role === 'admin' && (
            <TabsContent value="payment-settings" className="space-y-6 mt-0">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">Payment Settings</h1>
                  <p className="text-gray-500 text-sm">Configure PesaPal integration and manage payment credentials</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchPaymentSettings} disabled={isLoadingSettings} className="gap-2">
                  <RefreshCw className={`h-4 w-4 ${isLoadingSettings ? 'animate-spin' : ''}`} /> Refresh
                </Button>
              </div>

              {/* Mode + status banner */}
              <Card className={`border-2 ${paymentSettings?.pesapalMode === 'live' ? 'border-gray-300 bg-gray-50' : 'border-gray-300 bg-gray-50'}`}>
                <CardContent className="py-4 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Globe className={`h-6 w-6 ${paymentSettings?.pesapalMode === 'live' ? 'text-gray-600' : 'text-gray-600'}`} />
                    <div>
                      <div className="font-semibold text-gray-900">
                        {paymentSettings?.pesapalMode === 'live' ? 'Live Mode (Production)' : 'Sandbox Mode (Testing)'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {paymentSettings?.pesapalMode === 'live'
                          ? 'Real payments are being processed via pay.pesapal.com'
                          : 'Test payments only via cybqa.pesapal.com'}
                      </div>
                    </div>
                  </div>
                  <Badge className={paymentSettings?.pesapalMode === 'live' ? 'bg-gray-100 text-gray-800 border-gray-300 text-sm' : 'bg-gray-100 text-gray-800 border-gray-200 text-sm'}>
                    {paymentSettings?.pesapalMode === 'live' ? '● LIVE' : '◌ SANDBOX'}
                  </Badge>
                </CardContent>
              </Card>

              {/* PesaPal config card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-zinc-500" /> PesaPal Configuration
                  </CardTitle>
                  <CardDescription>Update your PesaPal API credentials. Changes take effect immediately.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Consumer Key</label>
                    <input
                      type="text"
                      value={settingsForm.pesapalConsumerKey}
                      onChange={e => setSettingsForm(f => ({ ...f, pesapalConsumerKey: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-800"
                      placeholder="PesaPal Consumer Key"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Consumer Secret</label>
                    <input
                      type="password"
                      value={settingsForm.pesapalConsumerSecret}
                      onChange={e => setSettingsForm(f => ({ ...f, pesapalConsumerSecret: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-800"
                      placeholder={paymentSettings?.pesapalConsumerSecret ? `Current: ${paymentSettings.pesapalConsumerSecret}` : "Enter new secret"}
                    />
                    <p className="text-xs text-gray-400">Leave blank to keep the existing secret unchanged.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Mode</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['sandbox', 'live'] as const).map(mode => (
                        <button
                          key={mode}
                          onClick={() => setSettingsForm(f => ({ ...f, pesapalMode: mode }))}
                          className={`py-2 px-4 rounded-lg border text-sm font-medium transition-colors capitalize ${settingsForm.pesapalMode === mode ? 'border-zinc-800 bg-zinc-900 text-white' : 'border-zinc-200 hover:border-zinc-400'}`}
                        >
                          {mode === 'live' ? '● Live (Production)' : '◌ Sandbox (Testing)'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button
                    className="bg-zinc-900 hover:bg-zinc-800 text-white w-full sm:w-auto gap-2"
                    disabled={isSavingSettings}
                    onClick={async () => {
                      if (!token) return;
                      setIsSavingSettings(true);
                      try {
                        const r = await fetch("/api/admin/settings", {
                          method: "PUT",
                          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                          body: JSON.stringify(settingsForm),
                        });
                        if (r.ok) {
                          await fetchPaymentSettings();
                          toast({ title: "Settings saved", description: "PesaPal configuration updated.", className: "bg-gray-50 border-gray-200 text-gray-800" });
                        } else {
                          const d = await r.json();
                          toast({ title: "Save failed", description: d.error, variant: "destructive" });
                        }
                      } finally { setIsSavingSettings(false); }
                    }}
                  >
                    {isSavingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}
                    Save Configuration
                  </Button>
                </CardContent>
              </Card>

              {/* IPN Registration */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">IPN Webhook</CardTitle>
                  <CardDescription>Register the Instant Payment Notification (IPN) URL with PesaPal. This allows PesaPal to notify inndos when a payment is completed.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gray-50 rounded-lg border p-3 font-mono text-xs text-gray-700 break-all">
                    {`${window.location.origin}/api/subscriptions/ipn`}
                  </div>
                  {paymentSettings?.pesapalIpnId && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Check className="h-4 w-4" />
                      <span>IPN Registered — ID: <span className="font-mono">{paymentSettings.pesapalIpnId}</span></span>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    className="gap-2"
                    disabled={isRegisteringIpn}
                    onClick={async () => {
                      if (!token) return;
                      setIsRegisteringIpn(true);
                      try {
                        const ipnUrl = `${window.location.origin}/api/subscriptions/ipn`;
                        const r = await fetch("/api/admin/settings/register-ipn", {
                          method: "POST",
                          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                          body: JSON.stringify({ ipnUrl }),
                        });
                        const d = await r.json();
                        if (r.ok) {
                          await fetchPaymentSettings();
                          toast({ title: "IPN Registered", description: `ID: ${d.ipnId}`, className: "bg-gray-50 border-gray-200 text-gray-800" });
                        } else {
                          toast({ title: "Registration failed", description: d.error, variant: "destructive" });
                        }
                      } finally { setIsRegisteringIpn(false); }
                    }}
                  >
                    {isRegisteringIpn ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    {paymentSettings?.pesapalIpnId ? 'Re-register IPN' : 'Register IPN URL'}
                  </Button>
                </CardContent>
              </Card>

              {/* Payment History */}
              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Payment History</CardTitle>
                    <CardDescription>All PesaPal payment transactions</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={fetchAdminPayments} disabled={isLoadingAdminPayments} className="gap-1 text-xs">
                    <RefreshCw className={`h-3 w-3 ${isLoadingAdminPayments ? 'animate-spin' : ''}`} />
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {isLoadingAdminPayments ? (
                    <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-zinc-400" /></div>
                  ) : adminPayments.length === 0 ? (
                    <div className="py-8 text-center text-gray-400 text-sm">No payments recorded yet</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold text-gray-600">User</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-600">Plan</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-600">Amount</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-600">Method</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-600">Date</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-600">Ref</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {adminPayments.map((p: any) => (
                            <tr key={p.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <div className="font-medium">{p.userName ?? "—"}</div>
                                <div className="text-xs text-gray-400">{p.userEmail}</div>
                              </td>
                              <td className="px-4 py-3">
                                <Badge className={p.plan === 'enterprise' ? 'bg-gray-100 text-gray-800' : p.plan === 'pro' ? 'bg-gray-100 text-gray-800' : p.plan === 'basic' ? 'bg-zinc-200 text-zinc-700' : 'bg-gray-100 text-gray-600'} style={{ textTransform: 'capitalize' }}>{p.plan}</Badge>
                              </td>
                              <td className="px-4 py-3 font-semibold">KES {p.amount?.toLocaleString()}</td>
                              <td className="px-4 py-3">
                                <Badge className={p.status === 'completed' ? 'bg-green-100 text-green-800' : p.status === 'pending' ? 'bg-gray-100 text-gray-800' : 'bg-red-100 text-red-700'}>
                                  {p.status}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-gray-500 text-xs">{p.paymentMethod ?? '—'}</td>
                              <td className="px-4 py-3 text-gray-500 text-xs">{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}</td>
                              <td className="px-4 py-3 text-gray-400 text-xs font-mono">{p.merchantReference?.slice(-10) ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* ── Admin: SMS Settings Tab ─────────────────────────── */}
          {user.role === 'admin' && (
            <TabsContent value="sms-settings" className="space-y-6 mt-0">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">SMS Settings</h1>
                  <p className="text-gray-500 text-sm">Configure your SMS provider for OTP verification and notifications</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchSmsSettings} disabled={isLoadingSmsSettings} className="gap-2">
                  <RefreshCw className={`h-4 w-4 ${isLoadingSmsSettings ? 'animate-spin' : ''}`} /> Refresh
                </Button>
              </div>

              {/* Status banner */}
              <Card className={`border-2 ${smsSettings?.configured ? 'border-gray-300 bg-gray-50' : 'border-gray-300 bg-gray-50'}`}>
                <CardContent className="py-4 px-6 flex items-center gap-3">
                  <MessageSquare className={`h-6 w-6 ${smsSettings?.configured ? 'text-gray-600' : 'text-gray-600'}`} />
                  <div>
                    <div className="font-semibold text-gray-900">
                      {smsSettings?.configured
                        ? `${smsSettings.provider === 'africastalking' ? "Africa's Talking" : "Airtouch"} SMS configured`
                        : 'SMS not configured'}
                    </div>
                    <div className="text-xs text-gray-500">
                      Provider: {smsSettings?.provider === 'africastalking' ? "Africa's Talking" : "Airtouch"}
                      {' · '}Sender ID: {smsSettings?.senderId || '—'}
                      {smsSettings?.provider !== 'africastalking' && ` · Username: ${smsSettings?.username || '—'}`}
                    </div>
                  </div>
                  <Badge className={`ml-auto ${smsSettings?.configured ? 'bg-gray-100 text-gray-800 border-gray-300' : 'bg-gray-100 text-gray-800 border-gray-200'} text-sm`}>
                    {smsSettings?.configured ? '● Active' : '◌ Unconfigured'}
                  </Badge>
                </CardContent>
              </Card>

              {/* Configuration form */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-zinc-500" /> SMS Configuration
                  </CardTitle>
                  <CardDescription>Select your SMS provider and enter credentials. Changes take effect immediately.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">

                  {/* Provider selector */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Provider</label>
                    <div className="flex gap-3">
                      {[
                        { value: "airtouch",      label: "Airtouch",          hint: "Username + Password" },
                        { value: "africastalking", label: "Africa's Talking",  hint: "API Key" },
                      ].map(p => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => setSmsForm(f => ({ ...f, provider: p.value }))}
                          className={`flex-1 border-2 rounded-lg px-4 py-3 text-left transition-all
                            ${smsForm.provider === p.value
                              ? 'border-zinc-900 bg-zinc-50'
                              : 'border-gray-200 hover:border-gray-300'}`}
                        >
                          <p className="text-sm font-semibold">{p.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{p.hint}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sender ID — always shown */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Sender Name / ID</label>
                    <input
                      type="text"
                      value={smsForm.senderId}
                      onChange={e => setSmsForm(f => ({ ...f, senderId: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-800"
                      placeholder="e.g. inndos"
                    />
                    <p className="text-xs text-gray-400">
                      {smsForm.provider === 'africastalking'
                        ? "Alphanumeric sender ID registered with Africa's Talking (or leave blank to use default shortcode)."
                        : "Alphanumeric sender ID registered with Airtouch."}
                    </p>
                  </div>

                  {/* Africa's Talking fields */}
                  {smsForm.provider === 'africastalking' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold">API Key</label>
                        <input
                          type="password"
                          value={smsForm.apiKey}
                          onChange={e => setSmsForm(f => ({ ...f, apiKey: e.target.value }))}
                          className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-800"
                          placeholder={smsSettings?.apiKeySet ? "Leave blank to keep current API key" : "Enter your Africa's Talking API key"}
                        />
                        {smsSettings?.apiKeySet && <p className="text-xs text-gray-400">API key is set. Leave blank to keep it unchanged.</p>}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold">Username</label>
                        <input
                          type="text"
                          value={smsForm.username}
                          onChange={e => setSmsForm(f => ({ ...f, username: e.target.value }))}
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-800"
                          placeholder="Your Africa's Talking username (e.g. inndos)"
                        />
                        <p className="text-xs text-gray-400">Your registered Africa's Talking account username.</p>
                      </div>
                    </div>
                  )}

                  {/* Airtouch fields */}
                  {smsForm.provider === 'airtouch' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold">Username</label>
                        <input
                          type="text"
                          value={smsForm.username}
                          onChange={e => setSmsForm(f => ({ ...f, username: e.target.value }))}
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-800"
                          placeholder="Parent account username (e.g. webexpert)"
                        />
                        <p className="text-xs text-amber-600 font-medium">⚠ Use the parent/master account credentials, not your sub-account username.</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold">Password</label>
                        <input
                          type="password"
                          value={smsForm.password}
                          onChange={e => setSmsForm(f => ({ ...f, password: e.target.value }))}
                          className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-800"
                          placeholder={smsSettings?.passwordSet ? "Leave blank to keep current password" : "Enter your Airtouch password"}
                        />
                        {smsSettings?.passwordSet && <p className="text-xs text-gray-400">Password is set. Leave blank to keep it unchanged.</p>}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold">API Key <span className="text-gray-400 font-normal">(optional)</span></label>
                        <input
                          type="password"
                          value={smsForm.apiKey}
                          onChange={e => setSmsForm(f => ({ ...f, apiKey: e.target.value }))}
                          className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-800"
                          placeholder={smsSettings?.apiKeySet ? "Leave blank to keep current API key" : "Enter your Airtouch API key (if required)"}
                        />
                        {smsSettings?.apiKeySet && <p className="text-xs text-gray-400">API key is set. Leave blank to keep it unchanged.</p>}
                        <p className="text-xs text-gray-400">Some Airtouch accounts use an API key instead of or alongside the password.</p>
                      </div>
                    </div>
                  )}

                  <Button
                    className="bg-zinc-900 hover:bg-zinc-800 text-white w-full sm:w-auto gap-2"
                    disabled={isSavingSmsSettings}
                    onClick={async () => {
                      setIsSavingSmsSettings(true);
                      try {
                        const body: Record<string, string | undefined> = {
                          provider: smsForm.provider,
                          senderId: smsForm.senderId,
                        };
                        if (smsForm.provider === 'airtouch') {
                          body.username = smsForm.username;
                          if (smsForm.password) body.password = smsForm.password;
                        } else {
                          body.username = smsForm.username;
                          if (smsForm.apiKey) body.apiKey = smsForm.apiKey;
                        }
                        const res = await fetch("/api/admin/sms-settings", {
                          method: "PUT",
                          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                          body: JSON.stringify(body),
                        });
                        if (!res.ok) throw new Error("Failed to save");
                        const providerLabel = smsForm.provider === 'africastalking' ? "Africa's Talking" : "Airtouch";
                        toast({ title: "SMS settings saved", description: `${providerLabel} configuration updated.` });
                        setSmsForm(f => ({ ...f, password: "", apiKey: "" }));
                        fetchSmsSettings();
                      } catch {
                        toast({ title: "Save failed", description: "Could not update SMS settings.", variant: "destructive" });
                      } finally { setIsSavingSmsSettings(false); }
                    }}
                  >
                    {isSavingSmsSettings ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <><Check className="h-4 w-4" /> Save Settings</>}
                  </Button>
                </CardContent>
              </Card>

              {/* Test SMS */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-zinc-500" /> Send Test SMS
                  </CardTitle>
                  <CardDescription>Send a test message to verify your SMS integration is working.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Phone Number</label>
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        value={smsTestPhone}
                        onChange={e => setSmsTestPhone(e.target.value)}
                        className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-800"
                        placeholder="07XXXXXXXX or +254XXXXXXXXX"
                      />
                      <Button
                        className="bg-zinc-900 hover:bg-zinc-800 text-white gap-2 shrink-0"
                        disabled={isSendingTestSms || !smsTestPhone.trim()}
                        onClick={async () => {
                          setIsSendingTestSms(true);
                          try {
                            const res = await fetch("/api/admin/sms-test", {
                              method: "POST",
                              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                              body: JSON.stringify({ phone: smsTestPhone.trim() }),
                            });
                            const data = await res.json().catch(() => ({}));
                            if (!res.ok) throw new Error((data as { error?: string }).error || "Send failed");
                            toast({ title: "Test SMS sent!", description: (data as { message?: string }).message ?? `Message sent to ${smsTestPhone}` });
                          } catch (err) {
                            toast({ title: "Test failed", description: err instanceof Error ? err.message : "Could not send test SMS.", variant: "destructive" });
                          } finally { setIsSendingTestSms(false); }
                        }}
                      >
                        {isSendingTestSms ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : "Send Test"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* ── Admin: Reviews Moderation Tab ───────────────────────── */}
          {user.role === 'admin' && (
            <TabsContent value="admin-reviews" className="space-y-6 mt-0">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">Review Moderation</h1>
                  <p className="text-gray-500 text-sm">View and remove inappropriate or spam reviews across all properties</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchAdminReviews} disabled={isLoadingAdminReviews} className="gap-2">
                  <RefreshCw className={`h-4 w-4 ${isLoadingAdminReviews ? 'animate-spin' : ''}`} /> Refresh
                </Button>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by property or reviewer…"
                    value={adminReviewsSearch}
                    onChange={e => setAdminReviewsSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex gap-2">
                  {[null, 1, 2, 3, 4, 5].map(r => (
                    <button
                      key={r ?? 'all'}
                      onClick={() => setAdminReviewsRatingFilter(r)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors
                        ${adminReviewsRatingFilter === r
                          ? 'bg-zinc-900 text-white border-zinc-900'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
                    >
                      {r === null ? 'All' : `${r}★`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { label: "Total Reviews", value: adminReviews.length },
                  { label: "1–2 Star", value: adminReviews.filter(r => r.rating <= 2).length },
                  { label: "Avg Rating", value: adminReviews.length > 0 ? (adminReviews.reduce((s, r) => s + r.rating, 0) / adminReviews.length).toFixed(1) : "—" },
                ].map(stat => (
                  <Card key={stat.label}>
                    <CardContent className="py-4 text-center">
                      <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                      <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Reviews table */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">All Reviews</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {isLoadingAdminReviews ? (
                    <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-zinc-400" /></div>
                  ) : (() => {
                    const filtered = adminReviews.filter(r => {
                      const searchLower = adminReviewsSearch.toLowerCase();
                      const matchSearch = !adminReviewsSearch
                        || r.propertyTitle?.toLowerCase().includes(searchLower)
                        || r.reviewerName?.toLowerCase().includes(searchLower)
                        || r.reviewerEmail?.toLowerCase().includes(searchLower)
                        || r.comment?.toLowerCase().includes(searchLower);
                      const matchRating = adminReviewsRatingFilter === null || r.rating === adminReviewsRatingFilter;
                      return matchSearch && matchRating;
                    }).sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
                    return filtered.length === 0 ? (
                      <div className="py-12 text-center text-gray-400">No reviews found</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 border-b">
                            <tr>
                              <th className="px-4 py-3 text-left font-semibold text-gray-600">Reviewer</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-600">Property</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-600">Rating</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-600">Comment</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-600">Date</th>
                              <th className="px-4 py-3 text-right font-semibold text-gray-600">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {filtered.map((review: any) => (
                              <tr key={review.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3">
                                  <div className="font-medium text-gray-900">{review.reviewerName ?? "—"}</div>
                                  <div className="text-xs text-gray-400">{review.reviewerEmail ?? ""}</div>
                                </td>
                                <td className="px-4 py-3 text-gray-700 max-w-[180px]">
                                  <div className="truncate">{review.propertyTitle ?? "—"}</div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="flex items-center gap-1">
                                    <Star className={`h-3.5 w-3.5 ${review.rating <= 2 ? 'text-red-400' : 'text-yellow-400'} fill-current`} />
                                    <span className={`font-semibold ${review.rating <= 2 ? 'text-red-600' : 'text-gray-800'}`}>{review.rating}</span>
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-gray-600 max-w-[260px]">
                                  <p className="line-clamp-2 text-xs">{review.comment || <span className="italic text-gray-400">No comment</span>}</p>
                                </td>
                                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                                  {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : "—"}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                                    onClick={async () => {
                                      if (!confirm(`Delete this review by ${review.reviewerName ?? "user"}? This cannot be undone.`)) return;
                                      try {
                                        const res = await fetch(`/api/reviews/${review.id}`, {
                                          method: "DELETE",
                                          headers: { Authorization: `Bearer ${token}` },
                                        });
                                        if (!res.ok) throw new Error("Failed to delete");
                                        setAdminReviews(prev => prev.filter(r => r.id !== review.id));
                                        fetchAdminProperties();
                                        toast({ title: "Review deleted", description: "The review has been removed." });
                                      } catch {
                                        toast({ title: "Delete failed", description: "Could not delete the review.", variant: "destructive" });
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" /> Delete
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Subscription Tab */}
      {(user.role === 'owner' || user.role === 'host') && (
        <TabsContent value="subscription" className="space-y-6 mt-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Subscription</h1>
              <p className="text-gray-500 text-sm">Manage your listing plan and billing</p>
            </div>
          </div>

          {/* Current Plan Banner */}
          {isLoadingSubscription ? (
            <Card className="border-2 border-zinc-200">
              <CardContent className="py-8 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
              </CardContent>
            </Card>
          ) : subscription && (
            <Card className={`border-2 ${subscription.plan === 'enterprise' ? 'border-purple-400 bg-purple-50' : subscription.plan === 'pro' ? 'border-yellow-400 bg-yellow-50' : subscription.plan === 'basic' ? 'border-zinc-400 bg-zinc-50' : 'border-zinc-200 bg-white'}`}>
              <CardContent className="py-5 px-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {subscription.plan === 'enterprise' ? <Crown className="h-7 w-7 text-gray-500" /> : subscription.plan === 'pro' ? <Crown className="h-7 w-7 text-gray-500" /> : subscription.plan === 'basic' ? <Zap className="h-7 w-7 text-zinc-500" /> : <Gift className="h-7 w-7 text-zinc-400" />}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold capitalize">{subscription.plan} Plan</span>
                        <Badge className={subscription.plan === 'enterprise' ? 'bg-gray-100 text-gray-800 border-gray-300' : subscription.plan === 'pro' ? 'bg-gray-100 text-gray-800 border-gray-200' : subscription.plan === 'basic' ? 'bg-zinc-200 text-zinc-700' : 'bg-gray-100 text-gray-600'}>
                          {subscription.status}
                        </Badge>
                      </div>
                      {subscription.plan !== 'free' && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Valid until {subscription.endDate} · {subscription.billingCycle === 'custom' ? `${subscription.billingMonths} months` : subscription.billingCycle}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-700">
                      {subscription.listingCount} / {subscription.listingLimit >= 2147483647 ? '∞' : subscription.listingLimit} listings used
                    </div>
                    <div className="w-40 bg-gray-200 rounded-full h-2 mt-1.5">
                      <div
                        className={`h-2 rounded-full ${subscription.plan === 'enterprise' ? 'bg-purple-500' : subscription.plan === 'pro' ? 'bg-yellow-400' : subscription.plan === 'basic' ? 'bg-zinc-500' : 'bg-zinc-800'}`}
                        style={{ width: subscription.listingLimit >= 2147483647 ? `${Math.min((subscription.listingCount / 10) * 100, 100)}%` : `${Math.min((subscription.listingCount / subscription.listingLimit) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
                {subscription.plan !== 'free' && (
                  <div className="mt-4 pt-3 border-t border-black/10">
                    <button
                      onClick={handleDowngradeToFree}
                      disabled={isUpgrading}
                      className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2"
                    >
                      Downgrade to Free
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Plan Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Free */}
            <Card className={`border-2 flex flex-col ${subscription?.plan === 'free' ? 'border-zinc-800 ring-2 ring-zinc-800 ring-offset-2' : 'border-zinc-200'}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Gift className="h-5 w-5 text-zinc-400" />
                  <CardTitle className="text-base font-bold">Free</CardTitle>
                  {subscription?.plan === 'free' && <Badge className="ml-auto text-[10px] bg-zinc-800 text-white">Current</Badge>}
                </div>
                <CardDescription className="text-2xl font-black text-zinc-900">KES 0<span className="text-gray-400 text-sm font-normal"> / month</span></CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 gap-4">
                <ul className="space-y-2 text-sm text-gray-600 flex-1">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gray-500 shrink-0" /> 3 active listings</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gray-500 shrink-0" /> <strong>5 photos</strong> per listing</li>
                  <li className="flex items-center gap-2 text-gray-400"><X className="h-4 w-4 shrink-0" /> No video / virtual tour</li>
                  <li className="flex items-center gap-2 text-gray-400"><X className="h-4 w-4 shrink-0" /> 0 featured listings / mo</li>
                  <li className="flex items-center gap-2 text-gray-400"><X className="h-4 w-4 shrink-0" /> No search boost</li>
                  <li className="flex items-center gap-2 text-gray-400"><X className="h-4 w-4 shrink-0" /> No phone support</li>
                </ul>
                <Button variant="outline" disabled className="w-full mt-auto">
                  {subscription?.plan === 'free' ? 'Active Plan' : 'Free Tier'}
                </Button>
              </CardContent>
            </Card>

            {/* Basic */}
            <Card className={`border-2 flex flex-col ${subscription?.plan === 'basic' ? 'border-zinc-500 ring-2 ring-zinc-500 ring-offset-2' : 'border-zinc-200'}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-5 w-5 text-zinc-500" />
                  <CardTitle className="text-base font-bold">Basic</CardTitle>
                  {subscription?.plan === 'basic' && <Badge className="ml-auto text-[10px] bg-zinc-500 text-white">Current</Badge>}
                </div>
                <CardDescription>
                  <span className="text-2xl font-black text-zinc-900">KES 199</span>
                  <span className="text-gray-400 text-sm"> / month</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 gap-4">
                <ul className="space-y-2 text-sm text-gray-600 flex-1">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gray-500 shrink-0" /> 10 active listings</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gray-500 shrink-0" /> <strong>15 photos</strong> per listing</li>
                  <li className="flex items-center gap-2 text-gray-400"><X className="h-4 w-4 shrink-0" /> No video / virtual tour</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gray-500 shrink-0" /> 1 featured listing / mo</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gray-500 shrink-0" /> Low search boost</li>
                  <li className="flex items-center gap-2 text-gray-400"><X className="h-4 w-4 shrink-0" /> No phone support</li>
                </ul>
                <Button
                  className="w-full mt-auto bg-zinc-800 hover:bg-zinc-700 text-white"
                  onClick={() => { setUpgradeDialogPlan("basic"); setBillingCycle("monthly"); setCustomMonths(3); }}
                  disabled={subscription?.plan === 'basic'}
                >
                  {subscription?.plan === 'basic' ? 'Active Plan' : subscription?.plan === 'pro' || subscription?.plan === 'enterprise' ? 'Downgrade to Basic' : 'Upgrade to Basic'}
                </Button>
              </CardContent>
            </Card>

            {/* Pro */}
            <Card className={`border-2 flex flex-col ${subscription?.plan === 'pro' ? 'border-yellow-400 ring-2 ring-yellow-400 ring-offset-2 bg-yellow-50' : 'border-yellow-300'}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="h-5 w-5 text-gray-500" />
                  <CardTitle className="text-base font-bold">Pro</CardTitle>
                  <Badge className="text-[10px] bg-gray-100 text-gray-800 border-gray-200">Popular</Badge>
                  {subscription?.plan === 'pro' && <Badge className="ml-auto text-[10px] bg-yellow-500 text-white">Current</Badge>}
                </div>
                <CardDescription>
                  <span className="text-2xl font-black text-zinc-900">KES 249</span>
                  <span className="text-gray-400 text-sm"> / month</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 gap-4">
                <ul className="space-y-2 text-sm text-gray-600 flex-1">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gray-500 shrink-0" /> 50 active listings</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gray-500 shrink-0" /> <strong>30 photos</strong> per listing</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gray-500 shrink-0" /> <strong>1 video</strong> / virtual tour per listing</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gray-500 shrink-0" /> 3 featured listings / mo</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gray-500 shrink-0" /> High search boost</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gray-500 shrink-0" /> Phone support</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gray-500 shrink-0" /> Export leads</li>
                </ul>
                <Button
                  className="w-full mt-auto bg-yellow-500 hover:bg-yellow-400 text-white font-semibold"
                  onClick={() => { setUpgradeDialogPlan("pro"); setBillingCycle("monthly"); setCustomMonths(3); }}
                  disabled={subscription?.plan === 'pro'}
                >
                  {subscription?.plan === 'pro' ? 'Active Plan' : subscription?.plan === 'enterprise' ? 'Downgrade to Pro' : 'Upgrade to Pro'}
                </Button>
              </CardContent>
            </Card>

            {/* Enterprise */}
            <Card className={`border-2 flex flex-col ${subscription?.plan === 'enterprise' ? 'border-purple-400 ring-2 ring-purple-400 ring-offset-2 bg-purple-50' : 'border-purple-300'}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="h-5 w-5 text-gray-500" />
                  <CardTitle className="text-base font-bold">Enterprise</CardTitle>
                  {subscription?.plan === 'enterprise' && <Badge className="ml-auto text-[10px] bg-purple-500 text-white">Current</Badge>}
                </div>
                <CardDescription className="text-2xl font-black text-zinc-900">Custom<span className="text-gray-400 text-sm font-normal"> pricing</span></CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 gap-4">
                <ul className="space-y-2 text-sm text-gray-600 flex-1">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gray-500 shrink-0" /> Unlimited active listings</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gray-500 shrink-0" /> <strong>Unlimited photos</strong> per listing</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gray-500 shrink-0" /> <strong>5 videos</strong> / virtual tours per listing</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gray-500 shrink-0" /> Negotiable featured listings</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gray-500 shrink-0" /> Highest search boost</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gray-500 shrink-0" /> 24/7 phone support</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gray-500 shrink-0" /> Dedicated account manager</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gray-500 shrink-0" /> API access + Export leads</li>
                </ul>
                {subscription?.plan === 'enterprise' ? (
                  <Button variant="outline" disabled className="w-full mt-auto">Active Plan</Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full mt-auto border-purple-300 text-gray-700 hover:bg-purple-50"
                    onClick={() => { setUpgradeDialogPlan("enterprise"); setBillingCycle("monthly"); setCustomMonths(3); }}
                  >
                    Contact Admin
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Upgrade Dialog */}
          <Dialog open={!!upgradeDialogPlan} onOpenChange={(open) => { if (!open) setUpgradeDialogPlan(null); }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {upgradeDialogPlan === 'enterprise' ? <Crown className="h-5 w-5 text-gray-500" /> : upgradeDialogPlan === 'pro' ? <Crown className="h-5 w-5 text-gray-500" /> : <Zap className="h-5 w-5 text-zinc-500" />}
                  Activate {upgradeDialogPlan === 'enterprise' ? 'Enterprise' : upgradeDialogPlan === 'pro' ? 'Pro' : 'Basic'} Plan
                </DialogTitle>
              </DialogHeader>
              {upgradeDialogPlan === 'enterprise' ? (
                <div className="space-y-4 py-2">
                  <p className="text-sm text-muted-foreground">Enterprise pricing is custom and requires admin approval. Contact the inndos team to get started.</p>
                  <div className="bg-gray-100 border border-gray-200 rounded-lg p-4 space-y-2 text-sm text-purple-800">
                    <p className="font-semibold">Enterprise includes:</p>
                    <ul className="space-y-1 text-xs">
                      <li>• Unlimited listings + unlimited photos</li>
                      <li>• 5 video / virtual tours per listing</li>
                      <li>• Dedicated account manager</li>
                      <li>• 24/7 phone support + API access</li>
                    </ul>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setUpgradeDialogPlan(null)}>Close</Button>
                  </DialogFooter>
                </div>
              ) : (
              <div className="space-y-5 py-2">
                <p className="text-sm text-muted-foreground">
                  {upgradeDialogPlan === 'pro' ? 'KES 249/month · 50 listings · 30 photos · 1 video · Phone support' : 'KES 199/month · 10 listings · 15 photos · 1 featured listing'}
                </p>

                {/* Billing cycle selector */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Billing Period</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['monthly', 'yearly', 'custom'] as const).map((cycle) => (
                      <button
                        key={cycle}
                        onClick={() => setBillingCycle(cycle)}
                        className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors capitalize ${billingCycle === cycle ? 'border-zinc-800 bg-zinc-900 text-white' : 'border-zinc-200 hover:border-zinc-400'}`}
                      >
                        {cycle === 'yearly' ? 'Yearly' : cycle === 'monthly' ? 'Monthly' : 'Custom'}
                      </button>
                    ))}
                  </div>
                  {billingCycle === 'yearly' && (
                    <p className="text-xs text-gray-600 font-medium">
                      Save KES {upgradeDialogPlan === 'pro' ? Math.round(249 * 0.1 * 12) : Math.round(199 * 0.1 * 12)} with yearly billing!
                    </p>
                  )}
                </div>

                {/* Custom months input */}
                {billingCycle === 'custom' && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Number of Months</label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setCustomMonths(m => Math.max(1, m - 1))}
                        className="h-8 w-8 rounded-full border border-zinc-300 flex items-center justify-center hover:bg-zinc-100 font-bold text-lg leading-none"
                      >−</button>
                      <span className="w-10 text-center font-bold text-lg">{customMonths}</span>
                      <button
                        onClick={() => setCustomMonths(m => Math.min(24, m + 1))}
                        className="h-8 w-8 rounded-full border border-zinc-300 flex items-center justify-center hover:bg-zinc-100 font-bold text-lg leading-none"
                      >+</button>
                      <span className="text-sm text-gray-500">months</span>
                    </div>
                  </div>
                )}

                {/* Price summary */}
                <div className="bg-gray-50 rounded-lg p-4 border space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Rate</span>
                    <span className="font-medium">KES {upgradeDialogPlan === 'pro' ? 249 : 199}/month</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Duration</span>
                    <span className="font-medium">
                      {billingCycle === 'monthly' ? '1 month' : billingCycle === 'yearly' ? '12 months' : `${customMonths} months`}
                    </span>
                  </div>
                  {billingCycle === 'yearly' && (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Yearly discount (10%)</span>
                      <span>− KES {upgradeDialogPlan === 'pro' ? Math.round(249 * 0.1 * 12) : Math.round(199 * 0.1 * 12)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base pt-1 border-t">
                    <span>Total</span>
                    <span>
                      KES {(() => {
                        const base = upgradeDialogPlan === 'pro' ? 249 : 199;
                        const months = billingCycle === 'monthly' ? 1 : billingCycle === 'yearly' ? 12 : customMonths;
                        const discount = billingCycle === 'yearly' ? Math.round(base * 0.1 * 12) : 0;
                        return (base * months - discount).toLocaleString();
                      })()}
                    </span>
                  </div>
                </div>
              </div>
              )}
              {upgradeDialogPlan !== 'enterprise' && (
              <DialogFooter className="flex-col gap-2 sm:flex-col">
                <Button
                  className="w-full bg-zinc-900 hover:bg-zinc-800 text-white gap-2"
                  disabled={isUpgrading}
                  onClick={async () => {
                    if (!upgradeDialogPlan || !token) return;
                    setIsUpgrading(true);
                    try {
                      const res = await fetch("/api/subscriptions/checkout", {
                        method: "POST",
                        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                        body: JSON.stringify({ plan: upgradeDialogPlan, billingCycle, months: customMonths }),
                      });
                      const data = await res.json();
                      if (!res.ok) {
                        toast({ title: "Checkout failed", description: data.error || "Could not initiate payment.", variant: "destructive" });
                        return;
                      }
                      window.location.href = data.redirectUrl;
                    } catch {
                      toast({ title: "Error", description: "Could not connect to payment gateway.", variant: "destructive" });
                    } finally {
                      setIsUpgrading(false);
                    }
                  }}
                >
                  {isUpgrading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                  Pay via PesaPal
                </Button>
                <div className="flex items-center gap-3 w-full">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400">or activate manually (demo)</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                <div className="flex gap-2 w-full">
                  <Button variant="outline" className="flex-1" onClick={() => setUpgradeDialogPlan(null)}>Cancel</Button>
                  <Button
                    variant="outline"
                    className="flex-1 text-xs"
                    onClick={handleSubscriptionUpgrade}
                    disabled={isUpgrading}
                  >
                    {isUpgrading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Activate (Skip Payment)
                  </Button>
                </div>
              </DialogFooter>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>
      )}
        </div>
      </div>

      {/* Property Calendar dialog */}
      <Dialog open={!!calendarProperty} onOpenChange={(open) => { if (!open) setCalendarProperty(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Availability Calendar
            </DialogTitle>
            {calendarProperty && (
              <p className="text-sm text-muted-foreground">{calendarProperty.title}</p>
            )}
          </DialogHeader>
          {calendarProperty && (
            <PropertyCalendar
              propertyId={calendarProperty.id}
              propertyTitle={calendarProperty.title}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Flag Dialog */}
      <Dialog open={!!flagDialogId} onOpenChange={(open) => { if (!open) { setFlagDialogId(null); setFlagComment(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-700"><AlertTriangle className="h-5 w-5" /> Flag Listing</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">This listing will be returned to the owner as "Flagged". It will not be visible on the platform until they fix the issues and resubmit.</p>
            <div className="space-y-1">
              <Label htmlFor="flag_comment" className="text-sm font-semibold">What needs to be corrected?</Label>
              <Textarea
                id="flag_comment"
                placeholder="e.g. The photos are blurry, please upload clearer images. Also the price seems inconsistent with the description..."
                value={flagComment}
                onChange={e => setFlagComment(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">The owner will see exactly this message.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setFlagDialogId(null); setFlagComment(""); }}>Cancel</Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700 text-white gap-2"
              disabled={!flagComment.trim() || isFlagging}
              onClick={handleFlag}
            >
              {isFlagging ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
              Flag & Return to Owner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Review Modal ───────────────────────────────────────────────────── */}
      <Dialog open={!!reviewModal?.open} onOpenChange={(o) => { if (!o) setReviewModal(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Star className="h-5 w-5" /> Rate Your Stay</DialogTitle>
            <DialogDescription>
              {reviewModal?.booking?.propertyTitle ?? "this property"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* Star picker */}
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setReviewRating(s)}
                  onMouseEnter={() => setReviewHover(s)}
                  onMouseLeave={() => setReviewHover(0)}
                  className="focus:outline-none"
                >
                  <Star
                    className={`h-9 w-9 transition-colors ${s <= (reviewHover || reviewRating) ? "fill-gray-900 text-gray-900" : "text-gray-300"}`}
                  />
                </button>
              ))}
            </div>
            {reviewRating > 0 && (
              <p className="text-center text-sm text-gray-600 -mt-2">
                {["", "Poor", "Fair", "Good", "Great", "Excellent"][reviewRating]}
              </p>
            )}
            {/* Comment */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Comment <span className="text-gray-400 font-normal">(optional)</span></label>
              <textarea
                className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-gray-900 min-h-[80px]"
                placeholder="Tell the owner what you loved or what could be improved…"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                maxLength={500}
              />
              <p className="text-[10px] text-gray-400 text-right">{reviewComment.length}/500</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReviewModal(null)} disabled={isSubmittingReview}>Cancel</Button>
            <Button
              disabled={reviewRating < 1 || isSubmittingReview}
              onClick={submitReview}
              className="gap-1"
            >
              {isSubmittingReview ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
              Submit Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ── Assign Plan dialog — at Tabs root so it opens instantly from any tab ── */}
      <Dialog open={!!assignSubDialog} onOpenChange={(open) => { if (!open) setAssignSubDialog(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign Subscription Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Assigning to: <span className="font-semibold">{assignSubDialog?.userName}</span></p>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Plan</label>
              <div className="grid grid-cols-2 gap-2">
                {(['free', 'basic', 'pro', 'enterprise'] as const).map(p => (
                  <button key={p} onClick={() => setAssignPlan(p)} className={`py-2 rounded-lg border text-sm font-medium capitalize transition-colors ${assignPlan === p ? 'border-zinc-800 bg-zinc-900 text-white' : 'border-zinc-200 hover:border-zinc-400'}`}>{p}</button>
                ))}
              </div>
            </div>
            {assignPlan !== 'free' && (
              <div className="space-y-2">
                <label className="text-sm font-semibold">Duration (months)</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setAssignMonths(m => Math.max(1, m - 1))} className="h-8 w-8 rounded-full border flex items-center justify-center hover:bg-zinc-100 font-bold text-lg leading-none">−</button>
                  <span className="w-8 text-center font-bold text-lg">{assignMonths}</span>
                  <button onClick={() => setAssignMonths(m => Math.min(24, m + 1))} className="h-8 w-8 rounded-full border flex items-center justify-center hover:bg-zinc-100 font-bold text-lg leading-none">+</button>
                  <span className="text-sm text-gray-500">months</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAssignSubDialog(null)}>Cancel</Button>
            <Button
              className="bg-zinc-900 hover:bg-zinc-800 text-white"
              disabled={isAssigning}
              onClick={async () => {
                if (!assignSubDialog || !token) return;
                setIsAssigning(true);
                try {
                  const r = await fetch("/api/admin/subscriptions/assign", {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ userId: assignSubDialog.userId, plan: assignPlan, billingMonths: assignMonths }),
                  });
                  if (r.ok) {
                    await fetchAdminSubscriptions();
                    setAssignSubDialog(null);
                    toast({ title: "Plan assigned", description: `${assignSubDialog.userName} is now on ${assignPlan} plan.`, className: "bg-gray-50 border-gray-200 text-gray-800" });
                  } else {
                    const d = await r.json();
                    toast({ title: "Failed", description: d.error, variant: "destructive" });
                  }
                } finally { setIsAssigning(false); }
              }}
            >
              {isAssigning ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Assign Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
