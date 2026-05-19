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
