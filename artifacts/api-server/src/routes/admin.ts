import { Router } from "express";
import { db } from "@workspace/db";
import { users, properties, bookings, subscriptions, payments, settings, subscriptionPlans, notifications, favorites } from "@workspace/db";
import { eq, count, sum, ne, asc, desc, and, inArray } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";
import { invalidateTokenCache, registerIPN } from "../services/pesapal";
import { sendListingApprovedEmail, sendListingRejectedEmail } from "../lib/email";
import bcrypt from "bcryptjs";

function getDashboardUrl(req: import("express").Request): string {
  const host = (process.env.REPLIT_DOMAINS ?? "").split(",")[0]?.trim();
  const origin = host ? `https://${host}` : `${req.protocol}://${req.get("host")}`;
  return `${origin}/owner`;
}

const router = Router();

async function requireAdmin(req: Parameters<typeof requireAuth>[0], res: Parameters<typeof requireAuth>[1]): Promise<string | null> {
  const userId = requireAuth(req, res);
  if (!userId) return null;

  const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return null;
  }

  return userId;
}

router.get("/stats", async (req, res) => {
  const userId = await requireAdmin(req, res);
  if (!userId) return;

  const [totalUsersResult] = await db.select({ count: count() }).from(users);
  const [totalPropertiesResult] = await db.select({ count: count() }).from(properties);
  const [totalBookingsResult] = await db.select({ count: count() }).from(bookings);
  const [revenueResult] = await db
    .select({ total: sum(bookings.totalPrice) })
    .from(bookings)
    .where(ne(bookings.status, "cancelled"));
  const [pendingResult] = await db
    .select({ count: count() })
    .from(properties)
    .where(eq(properties.isVerified, false));

  res.json({
    totalUsers: Number(totalUsersResult.count),
    totalProperties: Number(totalPropertiesResult.count),
    totalBookings: Number(totalBookingsResult.count),
    totalRevenue: Number(revenueResult.total ?? 0),
    pendingProperties: Number(pendingResult.count),
  });
});

router.get("/moderation", async (req, res) => {
  const userId = await requireAdmin(req, res);
  if (!userId) return;

  const rows = await db
    .select({
      id: properties.id,
      title: properties.title,
      type: properties.type,
      price: properties.price,
      address: properties.address,
      image: properties.image,
      beds: properties.beds,
      baths: properties.baths,
      sqft: properties.sqft,
      createdAt: properties.createdAt,
      ownerName: users.name,
      ownerId: properties.ownerId,
      propertyStatus: properties.propertyStatus,
      adminComment: properties.adminComment,
    })
    .from(properties)
    .leftJoin(users, eq(properties.ownerId, users.id))
    .where(eq(properties.isVerified, false));

  res.json(rows);
});

router.patch("/properties/:id/verify", async (req, res) => {
  const userId = await requireAdmin(req, res);
  if (!userId) return;

  const [prop] = await db
    .update(properties)
    .set({ isVerified: true, propertyStatus: "approved", adminComment: null })
    .where(eq(properties.id, req.params.id))
    .returning();

  if (!prop) {
    res.status(404).json({ error: "Property not found" });
    return;
  }

  const [owner] = await db
    .select({ email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, prop.ownerId));

  if (owner?.email) {
    sendListingApprovedEmail({
      ownerEmail: owner.email,
      ownerName: owner.name ?? "there",
      propertyTitle: prop.title,
      dashboardUrl: getDashboardUrl(req),
    }).catch((err: unknown) => {
      req.log.error({ err }, "Failed to send listing approved email");
    });
  }

  res.json(prop);
});

router.patch("/properties/:id/flag", async (req, res) => {
  const userId = await requireAdmin(req, res);
  if (!userId) return;

  const { comment } = req.body as { comment?: string };
  if (!comment?.trim()) {
    res.status(400).json({ error: "A comment explaining the issue is required" });
    return;
  }

  const [prop] = await db
    .update(properties)
    .set({ isVerified: false, propertyStatus: "flagged", adminComment: comment.trim() })
    .where(eq(properties.id, req.params.id))
    .returning();

  if (!prop) {
    res.status(404).json({ error: "Property not found" });
    return;
  }

  res.json(prop);
});

router.get("/users", async (req, res) => {
  const userId = await requireAdmin(req, res);
  if (!userId) return;

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      joinDate: users.joinDate,
      avatar: users.avatar,
      phone: users.phone,
      phoneVerified: users.phoneVerified,
      idDocument: users.idDocument,
      idFront: users.idFront,
      idBack: users.idBack,
    })
    .from(users)
    .orderBy(asc(users.joinDate));

  res.json(rows);
});

router.patch("/users/:id/status", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const { status } = req.body as { status?: string };
  if (status !== "active" && status !== "suspended") {
    res.status(400).json({ error: "status must be 'active' or 'suspended'" });
    return;
  }

  const [updated] = await db
    .update(users)
    .set({ status })
    .where(eq(users.id, req.params.id))
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      joinDate: users.joinDate,
    });

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(updated);
});

router.post("/users", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const { name, email, password, role } = req.body as { name?: string; email?: string; password?: string; role?: string };
  if (!name?.trim() || !email?.trim() || !password?.trim() || !role?.trim()) {
    res.status(400).json({ error: "Name, email, password, and role are required" });
    return;
  }

  const VALID_ROLES = ["owner", "host", "tenant", "admin"];
  if (!VALID_ROLES.includes(role)) {
    res.status(400).json({ error: "Invalid role. Must be one of: owner, host, tenant, admin" });
    return;
  }

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email.toLowerCase().trim()));
  if (existing) {
    res.status(409).json({ error: "A user with this email already exists" });
    return;
  }

  const hashed = await bcrypt.hash(password, 10);
  const [newUser] = await db
    .insert(users)
    .values({ name: name.trim(), email: email.toLowerCase().trim(), password: hashed, role: role as "owner" | "host" | "tenant" | "admin", status: "active" })
    .returning();

  const { password: _pw, ...safeUser } = newUser;
  res.status(201).json(safeUser);
});

router.delete("/users/:id", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const targetId = req.params.id;

  if (targetId === adminId) {
    res.status(400).json({ error: "You cannot delete your own account" });
    return;
  }

  const [target] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, targetId));
  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (target.role === "admin") {
    res.status(400).json({ error: "Cannot delete another admin account" });
    return;
  }

  // Cascade: notifications → favorites → bookings on user's properties → user's properties → bookings by user → subscriptions → user
  const userProperties = await db.select({ id: properties.id }).from(properties).where(eq(properties.ownerId, targetId));
  const propIds = userProperties.map(p => p.id);

  if (propIds.length > 0) {
    await db.delete(notifications).where(inArray(notifications.bookingId,
      db.select({ id: bookings.id }).from(bookings).where(inArray(bookings.propertyId, propIds)) as unknown as string[]
    )).catch(() => {});
    await db.delete(bookings).where(inArray(bookings.propertyId, propIds));
    await db.delete(properties).where(inArray(properties.id, propIds));
  }

  try { await db.delete(notifications).where(eq(notifications.userId, targetId)); } catch { /* table may not exist */ }
  try { await db.delete(favorites).where(eq(favorites.userId, targetId)); } catch { /* table may not exist */ }
  await db.delete(bookings).where(eq(bookings.userId, targetId));
  await db.delete(subscriptions).where(eq(subscriptions.userId, targetId));
  await db.delete(users).where(eq(users.id, targetId));

  res.json({ success: true });
});

router.patch("/properties/:id", async (req, res) => {
  const userId = await requireAdmin(req, res);
  if (!userId) return;

  const [prop] = await db.select({ id: properties.id, isVerified: properties.isVerified }).from(properties).where(eq(properties.id, req.params.id));
  if (!prop) {
    res.status(404).json({ error: "Property not found" });
    return;
  }

  const [updated] = await db
    .update(properties)
    .set({ isVerified: !prop.isVerified })
    .where(eq(properties.id, req.params.id))
    .returning();

  res.json(updated);
});

router.delete("/properties/:id", async (req, res) => {
  const userId = await requireAdmin(req, res);
  if (!userId) return;

  const [prop] = await db.select().from(properties).where(eq(properties.id, req.params.id));
  if (!prop) {
    res.status(404).json({ error: "Property not found" });
    return;
  }

  const [owner] = await db
    .select({ email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, prop.ownerId));

  await db.delete(bookings).where(eq(bookings.propertyId, req.params.id));
  await db.delete(properties).where(eq(properties.id, req.params.id));

  if (owner?.email) {
    sendListingRejectedEmail({
      ownerEmail: owner.email,
      ownerName: owner.name ?? "there",
      propertyTitle: prop.title,
      reason: prop.adminComment ?? undefined,
      dashboardUrl: getDashboardUrl(req),
    }).catch((err: unknown) => {
      req.log.error({ err }, "Failed to send listing rejected email");
    });
  }

  res.json({ success: true });
});

// ── Subscription Management ────────────────────────────────────────────

router.get("/subscriptions", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const rows = await db
    .select({
      id: subscriptions.id,
      userId: subscriptions.userId,
      userName: users.name,
      userEmail: users.email,
      plan: subscriptions.plan,
      status: subscriptions.status,
      billingCycle: subscriptions.billingCycle,
      billingMonths: subscriptions.billingMonths,
      amountPaid: subscriptions.amountPaid,
      startDate: subscriptions.startDate,
      endDate: subscriptions.endDate,
      createdAt: subscriptions.createdAt,
    })
    .from(subscriptions)
    .leftJoin(users, eq(subscriptions.userId, users.id))
    .orderBy(desc(subscriptions.createdAt));

  res.json(rows);
});

router.post("/subscriptions/assign", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const { userId, plan, billingMonths } = req.body as {
    userId?: string;
    plan?: string;
    billingMonths?: number;
  };

  if (!userId || !plan || !["standard", "silver", "gold"].includes(plan)) {
    res.status(400).json({ error: "userId and plan (standard/silver/gold) are required" });
    return;
  }

  const [targetUser] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId));
  if (!targetUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Cancel only currently active subscriptions for this user
  await db
    .update(subscriptions)
    .set({ status: "cancelled" })
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")));

  const now = new Date();

  if (plan === "standard") {
    // Standard is free/unlimited — create a no-expiry active record
    const [newSub] = await db
      .insert(subscriptions)
      .values({
        userId,
        plan: "standard",
        status: "active",
        billingCycle: "custom",
        billingMonths: 0,
        amountPaid: 0,
        startDate: now.toISOString().slice(0, 10),
        endDate: "9999-12-31",
      })
      .returning();
    res.status(201).json(newSub);
    return;
  }

  const months = billingMonths && billingMonths >= 1 ? Math.floor(billingMonths) : 1;
  const endDate = new Date(now);
  endDate.setMonth(endDate.getMonth() + months);

  const [newSub] = await db
    .insert(subscriptions)
    .values({
      userId,
      plan: plan as "silver" | "gold",
      status: "active",
      billingCycle: "custom",
      billingMonths: months,
      amountPaid: 0,
      startDate: now.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
    })
    .returning();

  res.status(201).json(newSub);
});

router.patch("/subscriptions/:id", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const { plan, status, endDate, billingMonths } = req.body as {
    plan?: string;
    status?: string;
    endDate?: string;
    billingMonths?: number;
  };

  const updates: Record<string, unknown> = {};
  if (plan && ["standard", "silver", "gold"].includes(plan)) updates.plan = plan;
  if (status && ["active", "expired", "cancelled"].includes(status)) updates.status = status;
  if (endDate) updates.endDate = endDate;
  if (billingMonths && billingMonths >= 1) updates.billingMonths = Math.floor(billingMonths);

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  const [updated] = await db
    .update(subscriptions)
    .set(updates as Parameters<typeof db.update>[0] extends never ? never : Record<string, unknown>)
    .where(eq(subscriptions.id, req.params.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Subscription not found" });
    return;
  }

  res.json(updated);
});

router.delete("/subscriptions/:id", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const [updated] = await db
    .update(subscriptions)
    .set({ status: "cancelled" })
    .where(eq(subscriptions.id, req.params.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Subscription not found" });
    return;
  }

  res.json({ success: true, id: updated.id });
});

// ── Payment History ─────────────────────────────────────────────────────

router.get("/payments", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const rows = await db
    .select({
      id: payments.id,
      userId: payments.userId,
      userName: users.name,
      userEmail: users.email,
      plan: payments.plan,
      amount: payments.amount,
      currency: payments.currency,
      billingMonths: payments.billingMonths,
      status: payments.status,
      paymentMethod: payments.paymentMethod,
      merchantReference: payments.merchantReference,
      pesapalTrackingId: payments.pesapalTrackingId,
      description: payments.description,
      createdAt: payments.createdAt,
    })
    .from(payments)
    .leftJoin(users, eq(payments.userId, users.id))
    .orderBy(desc(payments.createdAt));

  res.json(rows);
});

// ── Payment Settings ───────────────────────────────────────────────────

router.get("/settings", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const rows = await db.select().from(settings);
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;

  // Mask the secret key
  const maskedSecret = map["pesapal_consumer_secret"]
    ? "•".repeat(Math.max(0, map["pesapal_consumer_secret"].length - 4)) +
      map["pesapal_consumer_secret"].slice(-4)
    : "";

  res.json({
    pesapalConsumerKey: map["pesapal_consumer_key"] ?? "",
    pesapalConsumerSecret: maskedSecret,
    pesapalMode: map["pesapal_mode"] ?? "sandbox",
    pesapalIpnId: map["pesapal_ipn_id"] ?? "",
  });
});

router.put("/settings", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const { pesapalConsumerKey, pesapalConsumerSecret, pesapalMode } = req.body as {
    pesapalConsumerKey?: string;
    pesapalConsumerSecret?: string;
    pesapalMode?: string;
  };

  const upsert = async (key: string, value: string) => {
    await db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
  };

  if (pesapalConsumerKey !== undefined) await upsert("pesapal_consumer_key", pesapalConsumerKey);
  if (pesapalConsumerSecret !== undefined && !pesapalConsumerSecret.startsWith("•")) {
    await upsert("pesapal_consumer_secret", pesapalConsumerSecret);
  }
  if (pesapalMode && ["sandbox", "live"].includes(pesapalMode)) {
    await upsert("pesapal_mode", pesapalMode);
  }

  // Invalidate cached token so next request uses new credentials
  invalidateTokenCache();

  res.json({ success: true, message: "Settings updated" });
});

// ── Subscription Plan Management ───────────────────────────────────────

router.get("/plans", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;
  const rows = await db.select().from(subscriptionPlans);
  res.json(rows);
});

router.post("/plans", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const { name, displayName, pricePerMonth, listingLimit, features, isActive } = req.body as {
    name?: string;
    displayName?: string;
    pricePerMonth?: number;
    listingLimit?: number;
    features?: string[];
    isActive?: boolean;
  };

  if (!name || !/^[a-z0-9_-]+$/.test(name)) {
    res.status(400).json({ error: "Plan name must be lowercase alphanumeric (hyphens/underscores allowed)" });
    return;
  }
  if (!displayName?.trim()) {
    res.status(400).json({ error: "displayName is required" });
    return;
  }

  try {
    const [created] = await db
      .insert(subscriptionPlans)
      .values({
        name,
        displayName: displayName.trim(),
        pricePerMonth: Math.max(0, Math.floor(pricePerMonth ?? 0)),
        listingLimit: Math.max(1, Math.floor(listingLimit ?? 3)),
        features: Array.isArray(features) ? features.filter(f => f.trim()) : [],
        isActive: isActive !== false,
        updatedAt: new Date(),
      })
      .returning();
    res.status(201).json(created);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      res.status(409).json({ error: "A plan with that name already exists" });
    } else {
      res.status(500).json({ error: "Failed to create plan" });
    }
  }
});

router.put("/plans/:name", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const { name } = req.params;

  const { displayName, pricePerMonth, listingLimit, features, isActive } = req.body as {
    displayName?: string;
    pricePerMonth?: number;
    listingLimit?: number;
    features?: string[];
    isActive?: boolean;
  };

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (displayName !== undefined) updates.displayName = displayName;
  if (pricePerMonth !== undefined && pricePerMonth >= 0) updates.pricePerMonth = Math.floor(pricePerMonth);
  if (listingLimit !== undefined && listingLimit >= 1) updates.listingLimit = Math.floor(listingLimit);
  if (Array.isArray(features)) updates.features = features.filter(f => f.trim());
  if (isActive !== undefined) updates.isActive = Boolean(isActive);

  const [updated] = await db
    .update(subscriptionPlans)
    .set(updates as Parameters<typeof db.update>[0] extends never ? never : Record<string, unknown>)
    .where(eq(subscriptionPlans.name, name))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }

  // Invalidate the plan cache so subscriptions route picks up new values
  const { invalidatePlanCache } = await import("./subscriptions");
  invalidatePlanCache();

  res.json(updated);
});

router.delete("/plans/:name", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const { name } = req.params;

  const [deleted] = await db
    .delete(subscriptionPlans)
    .where(eq(subscriptionPlans.name, name))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }

  const { invalidatePlanCache } = await import("./subscriptions");
  invalidatePlanCache();

  res.json({ success: true });
});

router.get("/sms-settings", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const SMS_KEYS = ["sms_api_key", "sms_sender_id", "sms_provider", "sms_username", "sms_password"];
  const rows = await db.select({ key: settings.key, value: settings.value }).from(settings)
    .where(inArray(settings.key, SMS_KEYS));

  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;

  const provider = map["sms_provider"] ?? "airtouch";
  const configuredAirtouch = !!(map["sms_username"] && map["sms_password"]);
  const configuredAt = !!(map["sms_api_key"]);

  res.json({
    senderId:    map["sms_sender_id"] ?? "",
    provider,
    username:    map["sms_username"]  ?? "",
    passwordSet: !!map["sms_password"],
    apiKeySet:   !!map["sms_api_key"],
    configured:  provider === "africastalking" ? configuredAt : configuredAirtouch,
  });
});

router.put("/sms-settings", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const { senderId, username, password, provider, apiKey } = req.body as {
    senderId?: string; username?: string; password?: string;
    provider?: string; apiKey?: string;
  };

  const updates: { key: string; value: string }[] = [];
  if (senderId  !== undefined) updates.push({ key: "sms_sender_id", value: senderId });
  if (username  !== undefined) updates.push({ key: "sms_username",  value: username });
  if (password  !== undefined && password  !== "") updates.push({ key: "sms_password", value: password });
  if (apiKey    !== undefined && apiKey    !== "") updates.push({ key: "sms_api_key",  value: apiKey });
  if (provider  !== undefined) updates.push({ key: "sms_provider",  value: provider });

  for (const u of updates) {
    await db.insert(settings).values({ key: u.key, value: u.value, updatedAt: new Date() })
      .onConflictDoUpdate({ target: settings.key, set: { value: u.value, updatedAt: new Date() } });
  }

  res.json({ success: true });
});

router.post("/sms-test", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const { phone } = req.body as { phone?: string };
  if (!phone) {
    res.status(400).json({ error: "phone is required" });
    return;
  }

  const { sendSms, normalizePhone } = await import("../lib/sms");
  const normalized = normalizePhone(phone);
  if (!normalized) {
    res.status(400).json({ error: "Invalid phone number. Use format: 07XXXXXXXX or +254XXXXXXXXX" });
    return;
  }

  try {
    await sendSms(normalized, "INNDOS SMS test message. Your Airtouch integration is working correctly!");
    res.json({ success: true, message: `Test SMS sent to ${normalized}` });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "SMS send failed";
    res.status(502).json({ error: msg });
  }
});

router.post("/settings/register-ipn", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const { ipnUrl } = req.body as { ipnUrl?: string };
  if (!ipnUrl) {
    res.status(400).json({ error: "ipnUrl is required" });
    return;
  }

  try {
    const ipnId = await registerIPN(ipnUrl);
    res.json({ ipnId, message: "IPN registered successfully" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "IPN registration failed";
    res.status(502).json({ error: msg });
  }
});

export default router;
