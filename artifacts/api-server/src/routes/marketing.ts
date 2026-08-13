import { Router } from "express";
import { db } from "@workspace/db";
import {
  users, marketers, referrals, referralVisits, marketingAuditLog,
} from "@workspace/db";
import { eq, and, sql, desc, ilike, or, gte, lte, count, inArray } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";
import { logger } from "../lib/logger";

const router = Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

function ipFrom(req: any): string {
  return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.ip ?? "";
}

async function auditLog(
  adminId: string | null,
  action: string,
  targetMarketerId: string | null = null,
  targetUserId: string | null = null,
  details: string | null = null,
  ip: string | null = null
) {
  try {
    await db.insert(marketingAuditLog).values({
      adminId: adminId ?? undefined,
      action,
      targetMarketerId: targetMarketerId ?? undefined,
      targetUserId: targetUserId ?? undefined,
      details: details ?? undefined,
      ipAddress: ip ?? undefined,
    });
  } catch (e) {
    logger.error({ e }, "audit log insert failed");
  }
}

/** Generate a unique MKT-XXXXX code */
async function generateMarketerCode(): Promise<string> {
  const [row] = await db
    .select({ cnt: count() })
    .from(marketers);
  const next = (Number(row?.cnt ?? 0) + 1).toString().padStart(5, "0");
  return `MKT-${next}`;
}

/** Generate referral code from a user name, e.g. "John Doe" → "JOHN1234" */
async function generateReferralCode(name: string): Promise<string> {
  const base = name.replace(/\s+/g, "").toUpperCase().slice(0, 4);
  for (let attempt = 0; attempt < 20; attempt++) {
    const suffix = Math.floor(1000 + Math.random() * 9000).toString();
    const code = `${base}${suffix}`;
    const [existing] = await db.select({ id: marketers.id }).from(marketers).where(eq(marketers.referralCode, code));
    if (!existing) return code;
  }
  // fallback: uuid fragment
  return `MKT${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

/** Compute stats for one marketer */
async function marketerStats(marketerId: string) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart); weekStart.setDate(todayStart.getDate() - todayStart.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart  = new Date(now.getFullYear(), 0, 1);
  const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(todayStart.getDate() - 1);

  const allReferrals = await db
    .select({ referredUserId: referrals.referredUserId, createdAt: referrals.createdAt })
    .from(referrals)
    .where(eq(referrals.marketerId, marketerId));

  const referredUserIds = allReferrals.map(r => r.referredUserId);

  let activeCount = 0;
  let inactiveCount = 0;
  if (referredUserIds.length > 0) {
    const referredUsers = await db
      .select({ id: users.id, status: users.status })
      .from(users)
      .where(inArray(users.id, referredUserIds));
    activeCount   = referredUsers.filter(u => u.status === "active").length;
    inactiveCount = referredUsers.filter(u => u.status !== "active").length;
  }

  const total     = allReferrals.length;
  const today     = allReferrals.filter(r => new Date(r.createdAt) >= todayStart).length;
  const yesterday = allReferrals.filter(r => {
    const d = new Date(r.createdAt);
    return d >= yesterdayStart && d < todayStart;
  }).length;
  const thisWeek  = allReferrals.filter(r => new Date(r.createdAt) >= weekStart).length;
  const thisMonth = allReferrals.filter(r => new Date(r.createdAt) >= monthStart).length;
  const thisYear  = allReferrals.filter(r => new Date(r.createdAt) >= yearStart).length;
  const lastReferral = allReferrals.length > 0
    ? allReferrals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt
    : null;

  // visit stats
  const visits = await db
    .select({ converted: referralVisits.converted })
    .from(referralVisits)
    .where(eq(referralVisits.marketerId, marketerId));
  const totalVisits = visits.length;
  const conversionRate = totalVisits > 0 ? Math.round((total / totalVisits) * 100) : null;

  return { total, today, yesterday, thisWeek, thisMonth, thisYear, activeCount, inactiveCount, lastReferral, totalVisits, conversionRate };
}

// ── Public: Track referral link visit ────────────────────────────────────────

router.post("/visit", async (req, res) => {
  const { referralCode, landingPage } = req.body as { referralCode?: string; landingPage?: string };
  if (!referralCode) { res.status(400).json({ error: "referralCode required" }); return; }

  const [marketer] = await db.select().from(marketers).where(
    and(eq(marketers.referralCode, referralCode), eq(marketers.status, "active"))
  );
  if (!marketer) { res.status(404).json({ error: "Invalid referral code" }); return; }

  const sessionId = req.headers["x-session-id"] as string || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await db.insert(referralVisits).values({
    marketerId: marketer.id,
    referralCode,
    sessionId,
    ipAddress: ipFrom(req),
    userAgent: req.headers["user-agent"] ?? "",
    landingPage: landingPage ?? req.headers["referer"] ?? "",
  });

  res.json({ ok: true });
});

// ── Marketer: My profile & stats ──────────────────────────────────────────────

router.get("/me", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const [marketer] = await db.select().from(marketers).where(eq(marketers.userId, userId));
  if (!marketer) { res.status(404).json({ error: "Not a marketer" }); return; }
  if (marketer.status !== "active") { res.status(403).json({ error: "Marketer account is inactive" }); return; }

  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, phone: users.phone, avatar: users.avatar })
    .from(users)
    .where(eq(users.id, userId));

  const stats = await marketerStats(marketer.id);
  const referralLink = `https://inndos.com/#/login?ref=${marketer.referralCode}`;

  res.json({ marketer, user, stats, referralLink });
});

// ── Marketer: My referral list ────────────────────────────────────────────────

router.get("/me/referrals", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const [marketer] = await db.select().from(marketers).where(eq(marketers.userId, userId));
  if (!marketer || marketer.status !== "active") { res.status(403).json({ error: "Not an active marketer" }); return; }

  const { filter, dateFrom, dateTo, search, page = "1", limit = "50" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const pageSize = Math.min(100, Math.max(1, parseInt(limit)));

  const allReferrals = await db
    .select({
      referralId: referrals.id,
      referredUserId: referrals.referredUserId,
      referralCode: referrals.referralCode,
      createdAt: referrals.createdAt,
    })
    .from(referrals)
    .where(eq(referrals.marketerId, marketer.id))
    .orderBy(desc(referrals.createdAt));

  if (allReferrals.length === 0) { res.json({ data: [], total: 0, page: pageNum, limit: pageSize }); return; }

  const referredIds = allReferrals.map(r => r.referredUserId);
  const referredUsers = await db
    .select({ id: users.id, name: users.name, email: users.email, phone: users.phone, status: users.status })
    .from(users)
    .where(inArray(users.id, referredIds));
  const userMap = Object.fromEntries(referredUsers.map(u => [u.id, u]));

  let rows = allReferrals.map(r => ({ ...r, user: userMap[r.referredUserId] }));

  // filters
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(todayStart.getDate() - 1);
  const weekStart = new Date(todayStart); weekStart.setDate(todayStart.getDate() - todayStart.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  if (filter === "today")     rows = rows.filter(r => new Date(r.createdAt) >= todayStart);
  if (filter === "yesterday") rows = rows.filter(r => { const d = new Date(r.createdAt); return d >= yesterdayStart && d < todayStart; });
  if (filter === "week")      rows = rows.filter(r => new Date(r.createdAt) >= weekStart);
  if (filter === "month")     rows = rows.filter(r => new Date(r.createdAt) >= monthStart);
  if (dateFrom) rows = rows.filter(r => new Date(r.createdAt) >= new Date(dateFrom));
  if (dateTo)   rows = rows.filter(r => new Date(r.createdAt) <= new Date(dateTo + "T23:59:59"));
  if (filter === "active")   rows = rows.filter(r => r.user?.status === "active");
  if (filter === "inactive") rows = rows.filter(r => r.user?.status !== "active");
  if (search) {
    const s = search.toLowerCase();
    rows = rows.filter(r =>
      r.user?.name?.toLowerCase().includes(s) ||
      r.user?.email?.toLowerCase().includes(s) ||
      r.user?.phone?.toLowerCase().includes(s)
    );
  }

  const total = rows.length;
  const data  = rows.slice((pageNum - 1) * pageSize, pageNum * pageSize);
  res.json({ data, total, page: pageNum, limit: pageSize });
});

// ── Admin: Platform overview ──────────────────────────────────────────────────

router.get("/admin/overview", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const [caller] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
  if (caller?.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }

  const now = new Date();
  const todayStart  = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart   = new Date(todayStart); weekStart.setDate(todayStart.getDate() - todayStart.getDay());
  const monthStart  = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart   = new Date(now.getFullYear(), 0, 1);

  const [allMarketers, allReferralsRaw] = await Promise.all([
    db.select().from(marketers),
    db.select({ marketerId: referrals.marketerId, createdAt: referrals.createdAt }).from(referrals),
  ]);

  const totalMarketers  = allMarketers.length;
  const activeMarketers = allMarketers.filter(m => m.status === "active").length;
  const totalReferrals  = allReferralsRaw.length;
  const todayReferrals  = allReferralsRaw.filter(r => new Date(r.createdAt) >= todayStart).length;
  const weekReferrals   = allReferralsRaw.filter(r => new Date(r.createdAt) >= weekStart).length;
  const monthReferrals  = allReferralsRaw.filter(r => new Date(r.createdAt) >= monthStart).length;
  const yearReferrals   = allReferralsRaw.filter(r => new Date(r.createdAt) >= yearStart).length;

  // top marketer
  const countByMarketer: Record<string, number> = {};
  for (const r of allReferralsRaw) {
    countByMarketer[r.marketerId] = (countByMarketer[r.marketerId] ?? 0) + 1;
  }
  const topMarketerId = Object.entries(countByMarketer).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const topMarketer = topMarketerId
    ? allMarketers.find(m => m.id === topMarketerId) ?? null
    : null;
  let topMarketerUser = null;
  if (topMarketer) {
    const [u] = await db.select({ name: users.name, email: users.email, avatar: users.avatar }).from(users).where(eq(users.id, topMarketer.userId));
    topMarketerUser = u ?? null;
  }

  // performance breakdown
  const zeroReferrals = allMarketers.filter(m => !(m.id in countByMarketer)).length;
  const atLeastOne    = allMarketers.filter(m => m.id in countByMarketer).length;
  const avgReferrals  = totalMarketers > 0 ? Math.round(totalReferrals / totalMarketers) : 0;

  res.json({
    totalMarketers, activeMarketers, totalReferrals,
    todayReferrals, weekReferrals, monthReferrals, yearReferrals,
    topMarketer, topMarketerUser, topMarketerCount: topMarketerId ? countByMarketer[topMarketerId] : 0,
    zeroReferrals, atLeastOne, avgReferrals,
  });
});

// ── Admin: List all marketers ─────────────────────────────────────────────────

router.get("/admin/marketers", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const [caller] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
  if (caller?.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }

  const { search, status, sortBy = "createdAt", page = "1", limit = "50" } = req.query as Record<string, string>;
  const pageNum  = Math.max(1, parseInt(page));
  const pageSize = Math.min(100, Math.max(1, parseInt(limit)));

  const now = new Date();
  const todayStart  = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart   = new Date(todayStart); weekStart.setDate(todayStart.getDate() - todayStart.getDay());
  const monthStart  = new Date(now.getFullYear(), now.getMonth(), 1);

  let allMarketersList = await db.select().from(marketers);
  if (status === "active")   allMarketersList = allMarketersList.filter(m => m.status === "active");
  if (status === "inactive") allMarketersList = allMarketersList.filter(m => m.status === "inactive");

  const marketerIds = allMarketersList.map(m => m.id);
  const userIds     = allMarketersList.map(m => m.userId);

  const [marketerUsers, allReferralsRaw] = await Promise.all([
    userIds.length > 0 ? db.select({ id: users.id, name: users.name, email: users.email, phone: users.phone, avatar: users.avatar }).from(users).where(inArray(users.id, userIds)) : Promise.resolve([]),
    marketerIds.length > 0 ? db.select({ marketerId: referrals.marketerId, createdAt: referrals.createdAt }).from(referrals).where(inArray(referrals.marketerId, marketerIds)) : Promise.resolve([]),
  ]);

  const userMap = Object.fromEntries(marketerUsers.map(u => [u.id, u]));

  let rows = allMarketersList.map(m => {
    const user = userMap[m.userId];
    const mReferrals = allReferralsRaw.filter(r => r.marketerId === m.id);
    const total     = mReferrals.length;
    const today     = mReferrals.filter(r => new Date(r.createdAt) >= todayStart).length;
    const week      = mReferrals.filter(r => new Date(r.createdAt) >= weekStart).length;
    const month     = mReferrals.filter(r => new Date(r.createdAt) >= monthStart).length;
    const lastRef   = mReferrals.length > 0
      ? mReferrals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt
      : null;
    return { ...m, user, totalReferrals: total, todayReferrals: today, weekReferrals: week, monthReferrals: month, lastReferral: lastRef };
  });

  if (search) {
    const s = search.toLowerCase();
    rows = rows.filter(r =>
      r.user?.name?.toLowerCase().includes(s) ||
      r.user?.email?.toLowerCase().includes(s) ||
      r.user?.phone?.toLowerCase().includes(s) ||
      r.marketerCode.toLowerCase().includes(s) ||
      r.referralCode.toLowerCase().includes(s)
    );
  }

  // sort
  if (sortBy === "totalReferrals") rows.sort((a, b) => b.totalReferrals - a.totalReferrals);
  else if (sortBy === "totalReferralsAsc") rows.sort((a, b) => a.totalReferrals - b.totalReferrals);
  else rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = rows.length;
  const data  = rows.slice((pageNum - 1) * pageSize, pageNum * pageSize);
  res.json({ data, total, page: pageNum, limit: pageSize });
});

// ── Admin: Convert user to marketer ──────────────────────────────────────────

router.post("/admin/marketers", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const [caller] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
  if (caller?.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }

  const { targetUserId } = req.body as { targetUserId?: string };
  if (!targetUserId) { res.status(400).json({ error: "targetUserId required" }); return; }

  const [targetUser] = await db.select().from(users).where(eq(users.id, targetUserId));
  if (!targetUser) { res.status(404).json({ error: "User not found" }); return; }

  // Check already a marketer
  const [existing] = await db.select().from(marketers).where(eq(marketers.userId, targetUserId));
  if (existing) { res.status(409).json({ error: "User is already a marketer", marketer: existing }); return; }

  const marketerCode = await generateMarketerCode();
  const referralCode = await generateReferralCode(targetUser.name);

  const [newMarketer] = await db.insert(marketers).values({
    userId: targetUserId,
    marketerCode,
    referralCode,
    status: "active",
  }).returning();

  await auditLog(userId, "CONVERT_USER_TO_MARKETER", newMarketer.id, targetUserId,
    `Converted ${targetUser.name} (${targetUser.email}) to marketer ${marketerCode}`, ipFrom(req));

  res.status(201).json({ marketer: newMarketer, user: targetUser });
});

// ── Admin: Get individual marketer ────────────────────────────────────────────

router.get("/admin/marketers/:id", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const [caller] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
  if (caller?.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }

  const { id } = req.params;
  const [marketer] = await db.select().from(marketers).where(eq(marketers.id, id));
  if (!marketer) { res.status(404).json({ error: "Marketer not found" }); return; }

  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, phone: users.phone, avatar: users.avatar, status: users.status, joinDate: users.joinDate })
    .from(users)
    .where(eq(users.id, marketer.userId));

  const stats = await marketerStats(marketer.id);
  const referralLink = `https://inndos.com/#/login?ref=${marketer.referralCode}`;

  await auditLog(userId, "VIEW_MARKETER_ANALYTICS", marketer.id, null,
    `Admin viewed marketer ${marketer.marketerCode}`, ipFrom(req));

  res.json({ marketer, user, stats, referralLink });
});

// ── Admin: Update marketer (status / regenerate code) ────────────────────────

router.patch("/admin/marketers/:id", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const [caller] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
  if (caller?.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }

  const { id } = req.params;
  const [marketer] = await db.select().from(marketers).where(eq(marketers.id, id));
  if (!marketer) { res.status(404).json({ error: "Marketer not found" }); return; }

  const { status, regenerateCode } = req.body as { status?: "active" | "inactive"; regenerateCode?: boolean };
  const updates: Partial<typeof marketers.$inferInsert> = { updatedAt: new Date() };

  if (status && (status === "active" || status === "inactive")) {
    updates.status = status;
    await auditLog(userId, status === "active" ? "ACTIVATE_MARKETER" : "DEACTIVATE_MARKETER",
      marketer.id, marketer.userId, `Status changed to ${status}`, ipFrom(req));
  }

  if (regenerateCode) {
    const [targetUser] = await db.select({ name: users.name }).from(users).where(eq(users.id, marketer.userId));
    const newCode = await generateReferralCode(targetUser?.name ?? "MKT");
    updates.referralCode = newCode;
    // Note: historical referrals keep their snapshot referralCode — preserved automatically
    await auditLog(userId, "REGENERATE_REFERRAL_CODE", marketer.id, marketer.userId,
      `Referral code changed from ${marketer.referralCode} to ${newCode}`, ipFrom(req));
  }

  const [updated] = await db.update(marketers).set(updates).where(eq(marketers.id, id)).returning();
  res.json({ marketer: updated });
});

// ── Admin: Get referrals for one marketer ─────────────────────────────────────

router.get("/admin/marketers/:id/referrals", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const [caller] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
  if (caller?.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }

  const { id } = req.params;
  const { filter, dateFrom, dateTo, search, page = "1", limit = "50" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const pageSize = Math.min(200, Math.max(1, parseInt(limit)));

  const now = new Date();
  const todayStart    = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(todayStart.getDate() - 1);
  const weekStart     = new Date(todayStart); weekStart.setDate(todayStart.getDate() - todayStart.getDay());
  const monthStart    = new Date(now.getFullYear(), now.getMonth(), 1);

  let rows = await db
    .select({
      referralId: referrals.id,
      referredUserId: referrals.referredUserId,
      referralCode: referrals.referralCode,
      createdAt: referrals.createdAt,
    })
    .from(referrals)
    .where(eq(referrals.marketerId, id))
    .orderBy(desc(referrals.createdAt));

  if (rows.length === 0) { res.json({ data: [], total: 0, page: pageNum, limit: pageSize }); return; }

  const referredIds = rows.map(r => r.referredUserId);
  const referredUsers = await db
    .select({ id: users.id, name: users.name, email: users.email, phone: users.phone, status: users.status })
    .from(users)
    .where(inArray(users.id, referredIds));
  const userMap = Object.fromEntries(referredUsers.map(u => [u.id, u]));

  let enriched = rows.map(r => ({ ...r, user: userMap[r.referredUserId] }));

  if (filter === "today")     enriched = enriched.filter(r => new Date(r.createdAt) >= todayStart);
  if (filter === "yesterday") enriched = enriched.filter(r => { const d = new Date(r.createdAt); return d >= yesterdayStart && d < todayStart; });
  if (filter === "week")      enriched = enriched.filter(r => new Date(r.createdAt) >= weekStart);
  if (filter === "month")     enriched = enriched.filter(r => new Date(r.createdAt) >= monthStart);
  if (dateFrom) enriched = enriched.filter(r => new Date(r.createdAt) >= new Date(dateFrom));
  if (dateTo)   enriched = enriched.filter(r => new Date(r.createdAt) <= new Date(dateTo + "T23:59:59"));
  if (filter === "active")   enriched = enriched.filter(r => r.user?.status === "active");
  if (filter === "inactive") enriched = enriched.filter(r => r.user?.status !== "active");
  if (search) {
    const s = search.toLowerCase();
    enriched = enriched.filter(r =>
      r.user?.name?.toLowerCase().includes(s) ||
      r.user?.email?.toLowerCase().includes(s) ||
      r.user?.phone?.toLowerCase().includes(s)
    );
  }

  const total = enriched.length;
  const data  = enriched.slice((pageNum - 1) * pageSize, pageNum * pageSize);
  res.json({ data, total, page: pageNum, limit: pageSize });
});

// ── Admin: All referrals platform-wide ───────────────────────────────────────

router.get("/admin/referrals", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const [caller] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
  if (caller?.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }

  const { page = "1", limit = "100", search } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const pageSize = Math.min(200, Math.max(1, parseInt(limit)));

  const allReferrals = await db
    .select({
      id: referrals.id,
      marketerId: referrals.marketerId,
      referredUserId: referrals.referredUserId,
      referralCode: referrals.referralCode,
      createdAt: referrals.createdAt,
    })
    .from(referrals)
    .orderBy(desc(referrals.createdAt));

  if (allReferrals.length === 0) { res.json({ data: [], total: 0, page: pageNum, limit: pageSize }); return; }

  const marketerIds   = [...new Set(allReferrals.map(r => r.marketerId))];
  const referredIds   = allReferrals.map(r => r.referredUserId);
  const allMarketersList = await db.select().from(marketers).where(inArray(marketers.id, marketerIds));
  const marketerUserIds  = allMarketersList.map(m => m.userId);
  const [marketerUsers, referredUsers] = await Promise.all([
    db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(inArray(users.id, marketerUserIds)),
    db.select({ id: users.id, name: users.name, email: users.email, phone: users.phone, status: users.status }).from(users).where(inArray(users.id, referredIds)),
  ]);
  const marketerMap = Object.fromEntries(allMarketersList.map(m => [m.id, m]));
  const marketerUserMap = Object.fromEntries(marketerUsers.map(u => [u.id, u]));
  const referredMap     = Object.fromEntries(referredUsers.map(u => [u.id, u]));

  let rows = allReferrals.map(r => {
    const mk = marketerMap[r.marketerId];
    return {
      ...r,
      marketer: mk,
      marketerUser: mk ? marketerUserMap[mk.userId] : null,
      referredUser: referredMap[r.referredUserId],
    };
  });

  if (search) {
    const s = search.toLowerCase();
    rows = rows.filter(r =>
      r.referredUser?.name?.toLowerCase().includes(s) ||
      r.referredUser?.email?.toLowerCase().includes(s) ||
      r.marketerUser?.name?.toLowerCase().includes(s) ||
      r.referralCode.toLowerCase().includes(s)
    );
  }

  const total = rows.length;
  res.json({ data: rows.slice((pageNum - 1) * pageSize, pageNum * pageSize), total, page: pageNum, limit: pageSize });
});

// ── Admin: Chart analytics ────────────────────────────────────────────────────

router.get("/admin/analytics", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const [caller] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
  if (caller?.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }

  const { range = "7d", marketerId } = req.query as Record<string, string>;
  const now = new Date();
  let from: Date;
  let bucketFn: (d: Date) => string;
  let bucketCount: number;

  switch (range) {
    case "30d":  from = new Date(now); from.setDate(from.getDate() - 29); bucketFn = d => d.toISOString().slice(0, 10); bucketCount = 30; break;
    case "3m":   from = new Date(now); from.setDate(from.getDate() - 89); bucketFn = d => d.toISOString().slice(0, 10); bucketCount = 90; break;
    case "6m":   from = new Date(now); from.setMonth(from.getMonth() - 5); from.setDate(1); bucketFn = d => d.toISOString().slice(0, 7); bucketCount = 6; break;
    case "12m":  from = new Date(now); from.setMonth(from.getMonth() - 11); from.setDate(1); bucketFn = d => d.toISOString().slice(0, 7); bucketCount = 12; break;
    default:     from = new Date(now); from.setDate(from.getDate() - 6); bucketFn = d => d.toISOString().slice(0, 10); bucketCount = 7;
  }

  const conditions: any[] = [gte(referrals.createdAt, from)];
  if (marketerId) conditions.push(eq(referrals.marketerId, marketerId));

  const allReferrals = await db
    .select({ createdAt: referrals.createdAt })
    .from(referrals)
    .where(conditions.length > 1 ? and(...conditions) : conditions[0]);

  const bucketMap: Record<string, number> = {};
  for (const r of allReferrals) {
    const key = bucketFn(new Date(r.createdAt));
    bucketMap[key] = (bucketMap[key] ?? 0) + 1;
  }

  // build ordered labels
  const labels: string[] = [];
  if (range === "6m" || range === "12m") {
    for (let i = bucketCount - 1; i >= 0; i--) {
      const d = new Date(now); d.setMonth(d.getMonth() - i); d.setDate(1);
      labels.push(d.toISOString().slice(0, 7));
    }
  } else {
    for (let i = bucketCount - 1; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      labels.push(d.toISOString().slice(0, 10));
    }
  }

  const data = labels.map(l => ({ label: l, count: bucketMap[l] ?? 0 }));
  res.json({ data, range });
});

// ── Admin: Marketer comparison ────────────────────────────────────────────────

router.get("/admin/comparison", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const [caller] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
  if (caller?.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }

  const allMarketersList = await db.select().from(marketers);
  const marketerIds = allMarketersList.map(m => m.id);
  const userIds     = allMarketersList.map(m => m.userId);
  const [marketerUsers, allReferralsRaw] = await Promise.all([
    userIds.length > 0 ? db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, userIds)) : Promise.resolve([]),
    marketerIds.length > 0 ? db.select({ marketerId: referrals.marketerId }).from(referrals).where(inArray(referrals.marketerId, marketerIds)) : Promise.resolve([]),
  ]);
  const userMap = Object.fromEntries(marketerUsers.map(u => [u.id, u]));
  const countMap: Record<string, number> = {};
  for (const r of allReferralsRaw) countMap[r.marketerId] = (countMap[r.marketerId] ?? 0) + 1;

  const rows = allMarketersList
    .map(m => ({ marketerCode: m.marketerCode, name: userMap[m.userId]?.name ?? "Unknown", totalReferrals: countMap[m.id] ?? 0, status: m.status }))
    .sort((a, b) => b.totalReferrals - a.totalReferrals);

  res.json({ data: rows });
});

// ── Admin: Audit log ──────────────────────────────────────────────────────────

router.get("/admin/audit-log", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const [caller] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
  if (caller?.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }

  const { page = "1", limit = "50" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const pageSize = Math.min(200, Math.max(1, parseInt(limit)));

  const logs = await db
    .select()
    .from(marketingAuditLog)
    .orderBy(desc(marketingAuditLog.createdAt))
    .limit(pageSize)
    .offset((pageNum - 1) * pageSize);

  const [{ cnt }] = await db.select({ cnt: count() }).from(marketingAuditLog);

  res.json({ data: logs, total: Number(cnt), page: pageNum, limit: pageSize });
});

// ── Admin: Export CSV ─────────────────────────────────────────────────────────

router.get("/admin/export", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const [caller] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
  if (caller?.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }

  const { type = "referrals", marketerId } = req.query as Record<string, string>;

  let csv = "";
  if (type === "referrals") {
    const conditions: any[] = [];
    if (marketerId) conditions.push(eq(referrals.marketerId, marketerId));

    const rows = await db
      .select({
        id: referrals.id,
        marketerId: referrals.marketerId,
        referredUserId: referrals.referredUserId,
        referralCode: referrals.referralCode,
        createdAt: referrals.createdAt,
      })
      .from(referrals)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(referrals.createdAt));

    const referredIds = rows.map(r => r.referredUserId);
    const referredUsers = referredIds.length > 0
      ? await db.select({ id: users.id, name: users.name, email: users.email, phone: users.phone, status: users.status }).from(users).where(inArray(users.id, referredIds))
      : [];
    const userMap = Object.fromEntries(referredUsers.map(u => [u.id, u]));

    csv = "ID,Marketer ID,Referral Code,User Name,User Email,User Phone,Account Status,Date\n";
    for (const r of rows) {
      const u = userMap[r.referredUserId];
      csv += `${r.id},${r.marketerId},${r.referralCode},"${u?.name ?? ""}","${u?.email ?? ""}","${u?.phone ?? ""}",${u?.status ?? ""},${new Date(r.createdAt).toISOString()}\n`;
    }
  } else {
    // export marketers
    const allMarketersList = await db.select().from(marketers);
    const userIds = allMarketersList.map(m => m.userId);
    const marketerUsers = userIds.length > 0
      ? await db.select({ id: users.id, name: users.name, email: users.email, phone: users.phone }).from(users).where(inArray(users.id, userIds))
      : [];
    const userMap = Object.fromEntries(marketerUsers.map(u => [u.id, u]));

    csv = "Marketer Code,Referral Code,Name,Email,Phone,Status,Date Assigned\n";
    for (const m of allMarketersList) {
      const u = userMap[m.userId];
      csv += `${m.marketerCode},${m.referralCode},"${u?.name ?? ""}","${u?.email ?? ""}","${u?.phone ?? ""}",${m.status},${new Date(m.createdAt).toISOString()}\n`;
    }
  }

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="inndos-${type}-export.csv"`);
  res.send(csv);
});

// ── Admin: Search users to convert ───────────────────────────────────────────

router.get("/admin/search-users", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const [caller] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
  if (caller?.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }

  const { q } = req.query as { q?: string };
  if (!q || q.length < 2) { res.json({ data: [] }); return; }

  const results = await db
    .select({ id: users.id, name: users.name, email: users.email, phone: users.phone, avatar: users.avatar, role: users.role, status: users.status })
    .from(users)
    .where(or(ilike(users.name, `%${q}%`), ilike(users.email, `%${q}%`), ilike(users.phone, `%${q}%`)))
    .limit(10);

  // flag which ones are already marketers
  const ids = results.map(u => u.id);
  const existingMarketers = ids.length > 0
    ? await db.select({ userId: marketers.userId }).from(marketers).where(inArray(marketers.userId, ids))
    : [];
  const marketerSet = new Set(existingMarketers.map(m => m.userId));

  res.json({ data: results.map(u => ({ ...u, isMarketer: marketerSet.has(u.id) })) });
});

export default router;
