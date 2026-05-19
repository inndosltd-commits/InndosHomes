import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { db } from "@workspace/db";
import { users, insertUserSchema } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

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

router.post("/signup", async (req, res) => {
  const result = insertUserSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Invalid input", details: result.error.flatten() });
    return;
  }

  const { name, email, password, role } = result.data;

  const SELF_SIGNUP_ROLES = ["tenant", "guest"] as const;
  type SelfSignupRole = typeof SELF_SIGNUP_ROLES[number];
  const allowedRole: SelfSignupRole =
    role === "tenant" || role === "guest" ? role : "tenant";

  const existing = await db.select().from(users).where(eq(users.email, email));
  if (existing.length > 0) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }

  const hashed = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(users)
    .values({ name, email, password: hashed, role: allowedRole })
    .returning();

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

    const jwt = signToken(user.id);
    const { password: _pw, ...safeUser } = user;
    res.send(`<!DOCTYPE html><html><body><script>window.opener&&window.opener.postMessage({type:"linkedin_success",token:${JSON.stringify(jwt)},user:${JSON.stringify(safeUser)}},"*");window.close();</script></body></html>`);
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

    const token = signToken(user.id);
    const { password: _pw, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    req.log.error({ err }, "Google auth failed");
    res.status(401).json({ error: "Google authentication failed" });
  }
});

export default router;
