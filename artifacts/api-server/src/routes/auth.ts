import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { db } from "@workspace/db";
import { users, insertUserSchema, otpCodes, notifications, marketers, referrals, referralVisits } from "@workspace/db";
import { eq, and, gt, desc } from "drizzle-orm";
import { logger } from "../lib/logger";
import { sendSms, normalizePhone } from "../lib/sms";
import { sendPasswordResetEmail } from "../lib/email";
import { resolveTemplates } from "../lib/templateEngine";

const router = Router();

const rawSecret = process.env["JWT_SECRET"];
if (!rawSecret) {
  throw new Error("JWT_SECRET environment variable is required.");
}
const JWT_SECRET: string = rawSecret;

export function signToken(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (typeof decoded === "object" && decoded !== null && "userId" in decoded) {
      return decoded as { userId: string };
    }
    return null;
  } catch {
    return null;
  }
}

router.post("/send-otp", async (req, res) => {
  const { phone } = req.body as { phone?: string };
  if (!phone) {
    res.status(400).json({ error: "Phone number is required" });
    return;
  }

  const normalized = normalizePhone(phone);
  if (!normalized) {
    res.status(400).json({ error: "Invalid phone number. Use format: 07XXXXXXXX or +254XXXXXXXXX" });
    return;
  }

  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
  const recent = await db
    .select({ id: otpCodes.id })
    .from(otpCodes)
    .where(and(eq(otpCodes.phone, normalized), gt(otpCodes.createdAt, tenMinAgo)));
  if (recent.length >= 3) {
    res.status(429).json({ error: "Too many OTP requests. Please wait 10 minutes before trying again." });
    return;
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await db.insert(otpCodes).values({ phone: normalized, code, expiresAt });

  try {
    await sendSms(normalized, `Your inndos verification code is: ${code}. Valid for 10 minutes. Do not share this code.`);
    res.json({ success: true, message: "OTP sent successfully" });
  } catch (err) {
    logger.error({ err }, "Failed to send OTP SMS");
    res.status(502).json({ error: "Failed to send OTP. Please check your number and try again." });
  }
});

router.post("/verify-otp", async (req, res) => {
  const { phone, code } = req.body as { phone?: string; code?: string };
  if (!phone || !code) {
    res.status(400).json({ error: "Phone and code are required" });
    return;
  }

  const normalized = normalizePhone(phone);
  if (!normalized) {
    res.status(400).json({ error: "Invalid phone number" });
    return;
  }

  const [otp] = await db
    .select()
    .from(otpCodes)
    .where(and(eq(otpCodes.phone, normalized), eq(otpCodes.code, code), eq(otpCodes.used, false)))
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);

  if (!otp || new Date() > otp.expiresAt) {
    res.status(400).json({ error: "Invalid or expired verification code" });
    return;
  }

  await db.update(otpCodes).set({ used: true }).where(eq(otpCodes.id, otp.id));

  const phoneToken = jwt.sign(
    { phone: normalized, purpose: "phone_verification" },
    JWT_SECRET,
    { expiresIn: "15m" }
  );
  res.json({ success: true, phoneToken });
});

router.post("/signup", async (req, res) => {
  const result = insertUserSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Invalid input", details: result.error.flatten() });
    return;
  }

  const { name, email, password, role } = result.data;
  const { phoneToken, isRegisteredFirm, firmType } = req.body as { phoneToken?: string; isRegisteredFirm?: boolean; firmType?: string };

  if (!phoneToken) {
    res.status(400).json({ error: "Phone verification is required to create an account" });
    return;
  }

  let verifiedPhone: string;
  try {
    const decoded = jwt.verify(phoneToken, JWT_SECRET) as { phone?: string; purpose?: string };
    if (decoded.purpose !== "phone_verification" || !decoded.phone) throw new Error("Invalid token");
    verifiedPhone = decoded.phone;
  } catch {
    res.status(400).json({ error: "Phone verification token is invalid or expired. Please verify your phone again." });
    return;
  }

  const SELF_SIGNUP_ROLES = ["owner", "host", "tenant", "guest"] as const;
  type SelfSignupRole = typeof SELF_SIGNUP_ROLES[number];
  const allowedRole: SelfSignupRole =
    SELF_SIGNUP_ROLES.includes(role as SelfSignupRole) ? (role as SelfSignupRole) : "tenant";

  const existing = await db.select().from(users).where(eq(users.email, email));
  if (existing.length > 0) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }

  const hashed = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(users)
    .values({
      name, email, password: hashed, role: allowedRole, phone: verifiedPhone, phoneVerified: true,
      ...(typeof isRegisteredFirm === "boolean" ? { isRegisteredFirm } : {}),
      ...(typeof firmType === "string" ? { firmType: firmType as "business_name" | "registered_company" } : {}),
    })
    .returning();

  // Notify all admins of new registration (fire-and-forget)
  try {
    const adminUsers = await db.select({ id: users.id, phone: users.phone }).from(users).where(eq(users.role, "admin"));
    const signupVars = { userName: name, userEmail: email, userRole: allowedRole };
    const signupTmpl = await resolveTemplates(
      ["auth.signup.admin.bell", "auth.signup.admin.sms"],
      signupVars,
      {
        "auth.signup.admin.bell": `New user registered: ${name} (${email}) joined as ${allowedRole}.`,
        "auth.signup.admin.sms":  `📋 inndos Admin: New user registered — ${name} (${email}) joined as ${allowedRole}.`,
      }
    );
    for (const admin of adminUsers) {
      await db.insert(notifications).values({
        userId: admin.id,
        type: "new_user",
        message: signupTmpl["auth.signup.admin.bell"],
        isRead: false,
      });
      if (admin.phone) {
        sendSms(admin.phone, signupTmpl["auth.signup.admin.sms"]).catch(() => {});
      }
    }
  } catch (err) {
    logger.error({ err }, "Failed to notify admins of new user registration");
  }

  // ── Referral attribution (fire-and-forget) ────────────────────────────────
  const { referralCode } = req.body as { referralCode?: string };
  if (referralCode) {
    try {
      const [mktr] = await db
        .select()
        .from(marketers)
        .where(and(eq(marketers.referralCode, referralCode), eq(marketers.status, "active")));
      if (mktr) {
        // prevent duplicate: one user = one successful referral
        const [existingRef] = await db
          .select({ id: referrals.id })
          .from(referrals)
          .where(eq(referrals.referredUserId, user.id));
        if (!existingRef) {
          await db.insert(referrals).values({
            marketerId: mktr.id,
            referredUserId: user.id,
            referralCode,
          });
          // mark any visit records as converted
          await db
            .update(referralVisits)
            .set({ converted: true, convertedAt: new Date() })
            .where(and(eq(referralVisits.marketerId, mktr.id), eq(referralVisits.referralCode, referralCode), eq(referralVisits.converted, false)));
        }
      }
    } catch (err) {
      logger.error({ err }, "Failed to attribute referral");
    }
  }
  // ── End referral attribution ───────────────────────────────────────────────

  const token = signToken(user.id);
  const { password: _pw, ...safeUser } = user;
  res.status(201).json({ token, user: safeUser });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = signToken(user.id);
  const { password: _pw, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

router.get("/me", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  const [user] = await db.select().from(users).where(eq(users.id, payload.userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const { password: _pw, ...safeUser } = user;
  res.json(safeUser);
});

router.patch("/profile", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) { res.status(401).json({ error: "Not authenticated" }); return; }
  const payload = verifyToken(authHeader.slice(7));
  if (!payload) { res.status(401).json({ error: "Invalid or expired token" }); return; }

  const {
    name, avatar, idDocument, idFront, idBack,
    isRegisteredFirm, firmType, firmCertRegistration, firmCertIncorporation, firmCr12, firmDirectorIds,
    businessCertRegistration, businessPermit, role,
    phone, phoneVerified, phoneToken,
  } = req.body as {
    name?: string; avatar?: string; idDocument?: string; idFront?: string; idBack?: string;
    isRegisteredFirm?: boolean; firmType?: string;
    firmCertRegistration?: string; firmCertIncorporation?: string; firmCr12?: string;
    firmDirectorIds?: string[];
    businessCertRegistration?: string; businessPermit?: string;
    role?: string;
    phone?: string; phoneVerified?: boolean; phoneToken?: string;
  };
  const updates: Record<string, unknown> = {};
  if (typeof name === "string" && name.trim()) updates.name = name.trim();
  if (typeof avatar === "string") updates.avatar = avatar;
  // Phone update via verified phoneToken
  if (typeof phoneToken === "string" && phoneToken) {
    try {
      const JWT_SECRET = process.env.JWT_SECRET ?? "fallback-secret";
      const decoded = (await import("jsonwebtoken")).default.verify(phoneToken, JWT_SECRET) as { phone?: string; purpose?: string };
      if (decoded.purpose === "phone_verification" && decoded.phone) {
        updates.phone = decoded.phone;
        updates.phoneVerified = true;
      }
    } catch {
      res.status(400).json({ error: "Phone verification token is invalid or expired" });
      return;
    }
  } else if (typeof phone === "string" && phone.trim() && phoneVerified === true) {
    // Admin-internal: direct set (kept for Google OTP path which passes both fields)
    updates.phone = phone.trim();
    updates.phoneVerified = true;
  }
  if (typeof idDocument === "string") updates.idDocument = idDocument;
  if (typeof idFront === "string") updates.idFront = idFront;
  if (typeof idBack === "string") updates.idBack = idBack;
  if (typeof isRegisteredFirm === "boolean") updates.isRegisteredFirm = isRegisteredFirm;
  if (typeof firmType === "string") updates.firmType = firmType;
  if (typeof firmCertRegistration === "string") updates.firmCertRegistration = firmCertRegistration;
  if (typeof firmCertIncorporation === "string") updates.firmCertIncorporation = firmCertIncorporation;
  if (typeof firmCr12 === "string") updates.firmCr12 = firmCr12;
  if (Array.isArray(firmDirectorIds)) updates.firmDirectorIds = firmDirectorIds;
  if (typeof businessCertRegistration === "string") updates.businessCertRegistration = businessCertRegistration;
  if (typeof businessPermit === "string") updates.businessPermit = businessPermit;
  // Allow tenant/guest to upgrade to owner or host — fetch current role first to validate
  if (role === "owner" || role === "host") {
    const [cur] = await db.select({ role: users.role }).from(users).where(eq(users.id, payload.userId));
    if (cur && (cur.role === "tenant" || cur.role === "guest")) {
      updates.role = role;
    }
  }

  if (Object.keys(updates).length === 0) { res.status(400).json({ error: "No valid fields to update" }); return; }

  const [updated] = await db.update(users).set(updates).where(eq(users.id, payload.userId)).returning();
  if (!updated) { res.status(404).json({ error: "User not found" }); return; }

  const { password: _pw, ...safeUser } = updated;
  res.json(safeUser);
});

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  const [user] = await db.select({ id: users.id, name: users.name, email: users.email })
    .from(users).where(eq(users.email, email.toLowerCase().trim()));

  // Always return success to prevent email enumeration
  if (!user) {
    res.json({ ok: true, message: "If that email exists, a reset link has been sent." });
    return;
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.update(users)
    .set({ resetToken: token, resetTokenExpiry: expiry })
    .where(eq(users.id, user.id));

  const host = process.env["APP_DOMAIN"] ?? "inndos.com";
  const resetLink = `https://${host}/#/reset-password?token=${token}`;

  try {
    await sendPasswordResetEmail({ to: user.email, name: user.name, resetLink });
    req.log.info({ userId: user.id }, "Password reset email sent");
  } catch (err) {
    req.log.error({ err }, "Failed to send password reset email");
    res.status(500).json({ error: "Failed to send reset email. Please try again." });
    return;
  }

  res.json({ ok: true, message: "If that email exists, a reset link has been sent." });
});

router.post("/reset-password", async (req, res) => {
  const { token, password } = req.body as { token?: string; password?: string };
  if (!token || !password) {
    res.status(400).json({ error: "Token and new password are required" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  const [user] = await db.select({ id: users.id, resetTokenExpiry: users.resetTokenExpiry })
    .from(users).where(eq(users.resetToken, token));

  if (!user) {
    res.status(400).json({ error: "Invalid or expired reset link. Please request a new one." });
    return;
  }
  if (!user.resetTokenExpiry || new Date() > user.resetTokenExpiry) {
    res.status(400).json({ error: "This reset link has expired. Please request a new one." });
    return;
  }

  const hashed = await bcrypt.hash(password, 10);
  await db.update(users)
    .set({ password: hashed, resetToken: null, resetTokenExpiry: null })
    .where(eq(users.id, user.id));

  req.log.info({ userId: user.id }, "Password reset successfully");
  res.json({ ok: true, message: "Password updated successfully. You can now sign in." });
});

router.post("/facebook", async (req, res) => {
  const { accessToken, role } = req.body as { accessToken?: string; role?: string };
  if (!accessToken) { res.status(400).json({ error: "accessToken required" }); return; }

  const appId = process.env["FACEBOOK_APP_ID"];
  const appSecret = process.env["FACEBOOK_APP_SECRET"];
  if (!appId || !appSecret) { res.status(503).json({ error: "Facebook OAuth not configured" }); return; }

  try {
    const verifyUrl = `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${appId}|${appSecret}`;
    const verifyRes = await fetch(verifyUrl);
    const verifyData = await verifyRes.json() as { data?: { is_valid?: boolean; app_id?: string } };
    if (!verifyData.data?.is_valid || verifyData.data?.app_id !== appId) {
      res.status(401).json({ error: "Invalid Facebook token" }); return;
    }

    const profileRes = await fetch(`https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`);
    const profile = await profileRes.json() as { id?: string; name?: string; email?: string };
    if (!profile.email) { res.status(400).json({ error: "Facebook account has no email address" }); return; }

    const allowedRole = role === "owner" || role === "host" ? role : "tenant";
    let [user] = await db.select().from(users).where(eq(users.email, profile.email));
    if (!user) {
      const randomPassword = await bcrypt.hash((profile.id ?? "") + JWT_SECRET, 10);
      [user] = await db.insert(users).values({
        name: profile.name || profile.email.split("@")[0],
        email: profile.email,
        password: randomPassword,
        role: allowedRole,
      }).returning();
    }

    const token = signToken(user.id);
    const { password: _pw, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    req.log.error({ err }, "Facebook auth failed");
    res.status(401).json({ error: "Facebook authentication failed" });
  }
});

router.get("/linkedin/callback", async (req, res) => {
  const { code, state, error: oauthError } = req.query as Record<string, string>;
  const closeWithError = (msg: string) =>
    res.send(`<!DOCTYPE html><html><body><script>window.opener&&window.opener.postMessage({type:"linkedin_error",error:${JSON.stringify(msg)}},"*");window.close();</script></body></html>`);

  if (oauthError || !code) { closeWithError(oauthError || "No code returned"); return; }

  const clientId = process.env["LINKEDIN_CLIENT_ID"];
  const clientSecret = process.env["LINKEDIN_CLIENT_SECRET"];
  if (!clientId || !clientSecret) { closeWithError("LinkedIn OAuth not configured"); return; }

  const redirectUri = `${req.protocol}://${req.get("host")}/api/auth/linkedin/callback`;

  try {
    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri, client_id: clientId, client_secret: clientSecret }).toString(),
    });
    const tokenData = await tokenRes.json() as { access_token?: string };
    if (!tokenData.access_token) { closeWithError("Token exchange failed"); return; }

    const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json() as { sub?: string; name?: string; given_name?: string; family_name?: string; email?: string };
    if (!profile.email) { closeWithError("LinkedIn account has no email address"); return; }

    const allowedRole = state === "owner" || state === "host" ? state : "tenant";
    let [user] = await db.select().from(users).where(eq(users.email, profile.email));
    if (!user) {
      const name = profile.name || `${profile.given_name ?? ""} ${profile.family_name ?? ""}`.trim() || profile.email.split("@")[0];
      const randomPassword = await bcrypt.hash((profile.sub ?? "") + JWT_SECRET, 10);
      [user] = await db.insert(users).values({ name, email: profile.email, password: randomPassword, role: allowedRole }).returning();
    }

    const jwt2 = signToken(user.id);
    const { password: _pw, ...safeUser } = user;
    res.send(`<!DOCTYPE html><html><body><script>window.opener&&window.opener.postMessage({type:"linkedin_success",token:${JSON.stringify(jwt2)},user:${JSON.stringify(safeUser)}},"*");window.close();</script></body></html>`);
  } catch (err) {
    req.log.error({ err }, "LinkedIn auth failed");
    closeWithError("LinkedIn authentication failed");
  }
});

router.post("/google", async (req, res) => {
  const { credential, role } = req.body as { credential?: string; role?: string };
  if (!credential) {
    res.status(400).json({ error: "Missing Google credential" });
    return;
  }

  const clientId = process.env["GOOGLE_CLIENT_ID"];
  if (!clientId) {
    res.status(503).json({ error: "Google OAuth is not configured on this server" });
    return;
  }

  try {
    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      res.status(401).json({ error: "Invalid Google token" });
      return;
    }

    const { email, name, sub: googleId } = payload;

    let [user] = await db.select().from(users).where(eq(users.email, email));

    if (!user) {
      const allowedRole =
        role === "owner" || role === "host" ? role : "tenant";
      const randomPassword = await bcrypt.hash(googleId + JWT_SECRET, 10);
      [user] = await db
        .insert(users)
        .values({
          name: name || email.split("@")[0],
          email,
          password: randomPassword,
          role: allowedRole,
        })
        .returning();
    }

    const isNewUser = !user.phone;
    const token = signToken(user.id);
    const { password: _pw, ...safeUser } = user;
    res.json({ token, user: safeUser, isNewUser });
  } catch (err) {
    req.log.error({ err }, "Google auth failed");
    res.status(401).json({ error: "Google authentication failed" });
  }
});

export default router;
