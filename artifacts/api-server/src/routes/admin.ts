import { Router } from "express";
import { db } from "@workspace/db";
import { users, properties, bookings, subscriptions, payments, settings, subscriptionPlans, notifications, favorites, propertyTransactions } from "@workspace/db";
import { eq, count, sum, ne, asc, desc, and, inArray, gte, sql } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";
import { invalidateTokenCache, registerIPN } from "../services/pesapal";
import { sendListingApprovedEmail, sendListingRejectedEmail } from "../lib/email";
import { getDashboardUrl } from "../lib/appUrl";
import bcrypt from "bcryptjs";

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

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0]!;
  const weekAgoStr = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]!;
  const monthAgoStr = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]!;

  const [
    totalUsersRes, activeUsersRes, suspendedUsersRes,
    newTodayRes, newWeekRes, newMonthRes,
    ownerRes, hostRes, tenantRes, guestRes,
    totalPropsRes, activePropsRes, pendingPropsRes, soldPropsRes, flaggedPropsRes,
    rentRes, saleRes, bnbRes, hotelRes, hostelRes,
    totalBookRes, confirmBookRes, cancelBookRes, pendingBookRes, revenueRes,
    activeSubsRes, expiredSubsRes, cancelSubsRes,
    freeSubsRes, basicSubsRes, proSubsRes, enterpriseSubsRes,
    payRevenueRes, favRes,
    txRentedRes, txSoldRes, txValueRes,
  ] = await Promise.all([
    db.select({ count: count() }).from(users),
    db.select({ count: count() }).from(users).where(eq(users.status, "active")),
    db.select({ count: count() }).from(users).where(eq(users.status, "suspended")),
    db.select({ count: count() }).from(users).where(gte(users.joinDate, todayStr)),
    db.select({ count: count() }).from(users).where(gte(users.joinDate, weekAgoStr)),
    db.select({ count: count() }).from(users).where(gte(users.joinDate, monthAgoStr)),
    db.select({ count: count() }).from(users).where(eq(users.role, "owner")),
    db.select({ count: count() }).from(users).where(eq(users.role, "host")),
    db.select({ count: count() }).from(users).where(eq(users.role, "tenant")),
    db.select({ count: count() }).from(users).where(eq(users.role, "guest")),
    db.select({ count: count() }).from(properties),
    db.select({ count: count() }).from(properties).where(and(eq(properties.isVerified, true), eq(properties.propertyStatus, "approved"))),
    db.select({ count: count() }).from(properties).where(eq(properties.isVerified, false)),
    db.select({ count: count() }).from(properties).where(eq(properties.propertyStatus, "sold")),
    db.select({ count: count() }).from(properties).where(eq(properties.propertyStatus, "flagged")),
    db.select({ count: count() }).from(properties).where(eq(properties.type, "rent")),
    db.select({ count: count() }).from(properties).where(eq(properties.type, "sale")),
    db.select({ count: count() }).from(properties).where(eq(properties.type, "bnb")),
    db.select({ count: count() }).from(properties).where(eq(properties.type, "hotel")),
    db.select({ count: count() }).from(properties).where(eq(properties.type, "hostel")),
    db.select({ count: count() }).from(bookings),
    db.select({ count: count() }).from(bookings).where(eq(bookings.status, "confirmed")),
    db.select({ count: count() }).from(bookings).where(eq(bookings.status, "cancelled")),
    db.select({ count: count() }).from(bookings).where(eq(bookings.status, "pending")),
    db.select({ total: sum(bookings.totalPrice) }).from(bookings).where(eq(bookings.status, "confirmed")),
    db.select({ count: count() }).from(subscriptions).where(eq(subscriptions.status, "active")),
    db.select({ count: count() }).from(subscriptions).where(eq(subscriptions.status, "expired")),
    db.select({ count: count() }).from(subscriptions).where(eq(subscriptions.status, "cancelled")),
    db.select({ count: count() }).from(subscriptions).where(eq(subscriptions.plan, "free")),
    db.select({ count: count() }).from(subscriptions).where(eq(subscriptions.plan, "basic")),
    db.select({ count: count() }).from(subscriptions).where(eq(subscriptions.plan, "pro")),
    db.select({ count: count() }).from(subscriptions).where(eq(subscriptions.plan, "enterprise")),
    db.select({ total: sum(payments.amount) }).from(payments).where(eq(payments.status, "completed")),
    db.select({ count: count() }).from(favorites).catch(() => [{ count: 0 }]),
    db.select({ count: count() }).from(propertyTransactions).where(eq(propertyTransactions.status, "rented_via_inndos")),
    db.select({ count: count() }).from(propertyTransactions).where(eq(propertyTransactions.status, "sold_via_inndos")),
    db.select({ total: sum(propertyTransactions.transactionValue) }).from(propertyTransactions).where(
      sql`${propertyTransactions.status} IN ('rented_via_inndos','sold_via_inndos')`
    ),
  ]);

  // Monthly trends (last 12 months)
  const [monthlyReg, monthlyProps, monthlyRev, monthlyBook] = await Promise.all([
    db.execute(sql`
      SELECT TO_CHAR(DATE_TRUNC('month', join_date::date), 'Mon YY') as month,
             DATE_TRUNC('month', join_date::date) as month_date,
             COUNT(*)::int as count
      FROM users WHERE join_date::date >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', join_date::date) ORDER BY month_date ASC
    `),
    db.execute(sql`
      SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YY') as month,
             DATE_TRUNC('month', created_at) as month_date,
             COUNT(*)::int as count
      FROM properties WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at) ORDER BY month_date ASC
    `),
    db.execute(sql`
      SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YY') as month,
             DATE_TRUNC('month', created_at) as month_date,
             COALESCE(SUM(CASE WHEN status='completed' THEN amount ELSE 0 END),0)::int as revenue
      FROM payments WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at) ORDER BY month_date ASC
    `),
    db.execute(sql`
      SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YY') as month,
             DATE_TRUNC('month', created_at) as month_date,
             COUNT(*)::int as count
      FROM bookings WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at) ORDER BY month_date ASC
    `),
  ]);

  res.json({
    // Platform Growth
    totalUsers: Number(totalUsersRes[0]!.count),
    activeUsers: Number(activeUsersRes[0]!.count),
    suspendedUsers: Number(suspendedUsersRes[0]!.count),
    newUsersToday: Number(newTodayRes[0]!.count),
    newUsersThisWeek: Number(newWeekRes[0]!.count),
    newUsersThisMonth: Number(newMonthRes[0]!.count),
    usersByRole: {
      owner: Number(ownerRes[0]!.count),
      host: Number(hostRes[0]!.count),
      tenant: Number(tenantRes[0]!.count),
      guest: Number(guestRes[0]!.count),
    },
    // Property Analytics
    totalProperties: Number(totalPropsRes[0]!.count),
    activeProperties: Number(activePropsRes[0]!.count),
    pendingProperties: Number(pendingPropsRes[0]!.count),
    soldProperties: Number(soldPropsRes[0]!.count),
    flaggedProperties: Number(flaggedPropsRes[0]!.count),
    propertiesByType: {
      rent: Number(rentRes[0]!.count),
      sale: Number(saleRes[0]!.count),
      bnb: Number(bnbRes[0]!.count),
      hotel: Number(hotelRes[0]!.count),
      hostel: Number(hostelRes[0]!.count),
    },
    // Booking Analytics
    totalBookings: Number(totalBookRes[0]!.count),
    confirmedBookings: Number(confirmBookRes[0]!.count),
    cancelledBookings: Number(cancelBookRes[0]!.count),
    pendingBookings: Number(pendingBookRes[0]!.count),
    totalRevenue: Number(revenueRes[0]!.total ?? 0),
    // Subscriptions & Financial
    activeSubscriptions: Number(activeSubsRes[0]!.count),
    expiredSubscriptions: Number(expiredSubsRes[0]!.count),
    cancelledSubscriptions: Number(cancelSubsRes[0]!.count),
    subscriptionsByPlan: {
      free: Number(freeSubsRes[0]!.count),
      basic: Number(basicSubsRes[0]!.count),
      pro: Number(proSubsRes[0]!.count),
      enterprise: Number(enterpriseSubsRes[0]!.count),
    },
    totalPaymentRevenue: Number(payRevenueRes[0]!.total ?? 0),
    // Engagement
    totalFavorites: Number(favRes[0]!.count),
    // Transactions
    confirmedRentals: Number(txRentedRes[0]!.count),
    confirmedSales: Number(txSoldRes[0]!.count),
    totalMarketplaceValue: Number(txValueRes[0]!.total ?? 0),
    // Monthly Trends
    monthlyRegistrations: monthlyReg.rows.map((r: any) => ({ month: r.month, count: Number(r.count) })),
    monthlyProperties: monthlyProps.rows.map((r: any) => ({ month: r.month, count: Number(r.count) })),
    monthlyRevenue: monthlyRev.rows.map((r: any) => ({ month: r.month, revenue: Number(r.revenue) })),
    monthlyBookings: monthlyBook.rows.map((r: any) => ({ month: r.month, count: Number(r.count) })),
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
      dashboardUrl: getDashboardUrl(),
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
      isRegisteredFirm: users.isRegisteredFirm,
      firmType: users.firmType,
      firmCertRegistration: users.firmCertRegistration,
      firmCertIncorporation: users.firmCertIncorporation,
      firmCr12: users.firmCr12,
      firmDirectorIds: users.firmDirectorIds,
      businessName: users.businessName,
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

router.patch("/users/:id/password", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const targetId = req.params.id;

  if (targetId === adminId) {
    res.status(400).json({ error: "Use the profile settings to change your own password" });
    return;
  }

  const { password } = req.body as { password?: string };
  if (!password || password.length < 6) {
    res.status(400).json({ error: "New password must be at least 6 characters" });
    return;
  }

  const [target] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, targetId));
  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (target.role === "admin") {
    res.status(400).json({ error: "Cannot change another admin's password" });
    return;
  }

  const hashed = await bcrypt.hash(password, 10);
  await db.update(users).set({ password: hashed, resetToken: null, resetTokenExpiry: null }).where(eq(users.id, targetId));

  req.log.info({ adminId, targetId }, "Admin reset user password");
  res.json({ ok: true });
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
      dashboardUrl: getDashboardUrl(),
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
      featuredLimitOverride: subscriptions.featuredLimitOverride,
    })
    .from(subscriptions)
    .leftJoin(users, eq(subscriptions.userId, users.id))
    .orderBy(desc(subscriptions.createdAt));

  res.json(rows);
});

router.post("/subscriptions/assign", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const { userId, plan, billingMonths, featuredLimitOverride } = req.body as {
    userId?: string;
    plan?: string;
    billingMonths?: number;
    featuredLimitOverride?: number | null;
  };

  if (!userId || !plan || !["free", "basic", "pro", "enterprise"].includes(plan)) {
    res.status(400).json({ error: "userId and plan (free/basic/pro/enterprise) are required" });
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

  if (plan === "free") {
    // Free plan — create a no-expiry active record
    const [newSub] = await db
      .insert(subscriptions)
      .values({
        userId,
        plan: "free",
        status: "active",
        billingCycle: "custom",
        billingMonths: 0,
        amountPaid: 0,
        startDate: now.toISOString().slice(0, 10),
        endDate: "9999-12-31",
        featuredLimitOverride: null,
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
      plan: plan as "basic" | "pro" | "enterprise",
      status: "active",
      billingCycle: "custom",
      billingMonths: months,
      amountPaid: 0,
      startDate: now.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
      featuredLimitOverride: plan === "enterprise" && featuredLimitOverride != null
        ? Math.max(0, Math.floor(featuredLimitOverride))
        : null,
    })
    .returning();

  res.status(201).json(newSub);
});

router.patch("/subscriptions/:id", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const { plan, status, endDate, billingMonths, featuredLimitOverride } = req.body as {
    plan?: string;
    status?: string;
    endDate?: string;
    billingMonths?: number;
    featuredLimitOverride?: number | null;
  };

  const updates: Record<string, unknown> = {};
  if (plan && ["free", "basic", "pro", "enterprise"].includes(plan)) updates.plan = plan;
  if (status && ["active", "expired", "cancelled"].includes(status)) updates.status = status;
  if (endDate) updates.endDate = endDate;
  if (billingMonths && billingMonths >= 1) updates.billingMonths = Math.floor(billingMonths);
  if (featuredLimitOverride === null || (typeof featuredLimitOverride === "number" && featuredLimitOverride >= 0)) {
    updates.featuredLimitOverride = featuredLimitOverride === null ? null : Math.floor(featuredLimitOverride);
  }

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


// ── Notification Templates ────────────────────────────────────────────────────

// GET /api/admin/notification-templates
router.get("/notification-templates", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const { category, channel } = req.query as Record<string, string>;
  try {
    const catFilter  = category ? sql` AND category = ${category}` : sql``;
    const chanFilter = channel  ? sql` AND channel  = ${channel}`  : sql``;
    const result = await db.execute(sql`
      SELECT id, key, category, channel, label, subject, body, cta_label,
             default_subject, default_body, default_cta_label,
             variables, is_active, updated_by, updated_at
      FROM notification_templates
      WHERE 1=1 ${catFilter} ${chanFilter}
      ORDER BY category, channel, key
    `);
    res.json(result.rows);
  } catch (err) {
    req.log?.error({ err }, "Failed to list notification templates");
    res.status(500).json({ error: "Failed to fetch templates" });
  }
});

// GET /api/admin/notification-templates/:key
router.get("/notification-templates/:key", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  try {
    const result = await db.execute(sql`
      SELECT id, key, category, channel, label, subject, body, cta_label,
             default_subject, default_body, default_cta_label,
             variables, is_active, updated_by, updated_at
      FROM notification_templates WHERE key = ${req.params.key} LIMIT 1
    `);
    if (!result.rows.length) {
      res.status(404).json({ error: "Template not found" });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    req.log?.error({ err }, "Failed to get notification template");
    res.status(500).json({ error: "Failed to fetch template" });
  }
});

// PUT /api/admin/notification-templates/:key
router.put("/notification-templates/:key", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const { subject, body, ctaLabel } = req.body as {
    subject?: string | null;
    body?: string;
    ctaLabel?: string | null;
  };

  if (!body || !body.trim()) {
    res.status(400).json({ error: "body is required" });
    return;
  }

  try {
    const result = await db.execute(sql`
      UPDATE notification_templates
      SET subject   = ${subject ?? null},
          body      = ${body.trim()},
          cta_label = ${ctaLabel ?? null},
          updated_by = ${adminId},
          updated_at = NOW()
      WHERE key = ${req.params.key}
      RETURNING id, key, category, channel, label, subject, body, cta_label,
                default_subject, default_body, default_cta_label,
                variables, is_active, updated_by, updated_at
    `);
    if (!result.rows.length) {
      res.status(404).json({ error: "Template not found" });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    req.log?.error({ err }, "Failed to update notification template");
    res.status(500).json({ error: "Failed to update template" });
  }
});

// POST /api/admin/notification-templates/:key/reset
router.post("/notification-templates/:key/reset", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  try {
    const result = await db.execute(sql`
      UPDATE notification_templates
      SET subject   = default_subject,
          body      = default_body,
          cta_label = default_cta_label,
          updated_by = ${adminId},
          updated_at = NOW()
      WHERE key = ${req.params.key}
      RETURNING id, key, category, channel, label, subject, body, cta_label,
                default_subject, default_body, default_cta_label,
                variables, is_active, updated_by, updated_at
    `);
    if (!result.rows.length) {
      res.status(404).json({ error: "Template not found" });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    req.log?.error({ err }, "Failed to reset notification template");
    res.status(500).json({ error: "Failed to reset template" });
  }
});

export default router;
