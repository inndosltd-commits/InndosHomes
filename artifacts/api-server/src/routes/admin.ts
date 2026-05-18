import { Router } from "express";
import { db } from "@workspace/db";
import { users, properties, bookings, subscriptions, payments, settings } from "@workspace/db";
import { eq, count, sum, ne, asc, desc } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";
import { invalidateTokenCache, registerIPN } from "../services/pesapal";

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

  await db.delete(bookings).where(eq(bookings.propertyId, req.params.id));
  await db.delete(properties).where(eq(properties.id, req.params.id));
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

  // Cancel existing active subscriptions
  await db
    .update(subscriptions)
    .set({ status: "cancelled" })
    .where(eq(subscriptions.userId, userId));

  if (plan === "standard") {
    res.json({ message: "User downgraded to Standard (Free)" });
    return;
  }

  const months = billingMonths && billingMonths >= 1 ? Math.floor(billingMonths) : 1;
  const now = new Date();
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
