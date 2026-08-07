/**
 * Property Transaction Confirmation Workflow
 * Handles rental & sale confirmation after a Link-Up, analytics, and admin resolution.
 */

import { Router } from "express";
import { db } from "@workspace/db";
import {
  propertyTransactions,
  bookings,
  properties,
  users,
  notifications,
} from "@workspace/db";
import { eq, or, and, inArray, desc, gte, sql } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";
import { sendSms } from "../lib/sms";
import { sendTransactionConfirmationEmail } from "../lib/email";

const router = Router();

// ─── helpers ──────────────────────────────────────────────────────────────────

type ConfirmationValue = "pending" | "confirmed" | "not_completed" | "outside_inndos";
type TxStatus =
  | "pending_confirmation"
  | "confirmed_by_owner_only"
  | "confirmed_by_tenant_only"
  | "fully_confirmed"
  | "disputed"
  | "cancelled"
  | "not_completed"
  | "confirmed_outside_inndos"
  | "sold_via_inndos"
  | "rented_via_inndos";

function computeStatus(
  ownerConf: ConfirmationValue,
  tenantConf: ConfirmationValue,
  txType: "rental" | "sale"
): TxStatus {
  if (ownerConf === "pending" && tenantConf === "pending") return "pending_confirmation";
  if (ownerConf !== "pending" && tenantConf === "pending") return "confirmed_by_owner_only";
  if (ownerConf === "pending" && tenantConf !== "pending") return "confirmed_by_tenant_only";
  // Both parties responded
  if (ownerConf === "confirmed" && tenantConf === "confirmed") {
    return txType === "sale" ? "sold_via_inndos" : "rented_via_inndos";
  }
  if (ownerConf === "outside_inndos" && tenantConf === "outside_inndos") {
    return "confirmed_outside_inndos";
  }
  if (ownerConf === "not_completed" && tenantConf === "not_completed") {
    return "not_completed";
  }
  return "disputed";
}

function getBaseUrl(): string {
  const domains = process.env.REPLIT_DOMAINS?.split(",")[0];
  return domains ? `https://${domains}` : "https://inndos.com";
}

// ─── GET /api/transactions ─────────────────────────────────────────────────────
// Returns all transactions where current user is owner OR tenant
router.get("/", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const rows = await db
    .select()
    .from(propertyTransactions)
    .where(
      or(
        eq(propertyTransactions.ownerId, userId),
        eq(propertyTransactions.tenantId, userId)
      )
    )
    .orderBy(desc(propertyTransactions.createdAt));

  res.json(rows);
});

// ─── GET /api/transactions/analytics ──────────────────────────────────────────
router.get("/analytics", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const rows = await db
    .select()
    .from(propertyTransactions)
    .where(
      or(
        eq(propertyTransactions.ownerId, userId),
        eq(propertyTransactions.tenantId, userId)
      )
    );

  const confirmedRentals = rows.filter(r => r.status === "rented_via_inndos").length;
  const confirmedSales = rows.filter(r => r.status === "sold_via_inndos").length;
  const pending = rows.filter(r =>
    ["pending_confirmation", "confirmed_by_owner_only", "confirmed_by_tenant_only"].includes(r.status)
  ).length;
  const disputed = rows.filter(r => r.status === "disputed").length;
  const fullyConfirmed = confirmedRentals + confirmedSales;
  const confirmedRows = rows.filter(r =>
    r.status === "rented_via_inndos" || r.status === "sold_via_inndos"
  );
  const totalValue = confirmedRows.reduce((s, r) => s + (r.transactionValue || 0), 0);

  // Monthly breakdown (last 6 months)
  const now = new Date();
  const monthlyData: { month: string; rentals: number; sales: number; value: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
    const monthRows = confirmedRows.filter(r => {
      const cd = new Date(r.createdAt);
      return cd.getFullYear() === d.getFullYear() && cd.getMonth() === d.getMonth();
    });
    monthlyData.push({
      month: label,
      rentals: monthRows.filter(r => r.status === "rented_via_inndos").length,
      sales: monthRows.filter(r => r.status === "sold_via_inndos").length,
      value: monthRows.reduce((s, r) => s + (r.transactionValue || 0), 0),
    });
  }

  res.json({
    total: rows.length,
    fullyConfirmed,
    pending,
    disputed,
    confirmedRentals,
    confirmedSales,
    totalValue,
    monthlyData,
  });
});

// ─── POST /api/transactions/:id/confirm ───────────────────────────────────────
// Owner or tenant submits their confirmation outcome
router.post("/:id/confirm", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { confirmation } = req.body as { confirmation: ConfirmationValue };
  if (!["confirmed", "not_completed", "outside_inndos"].includes(confirmation)) {
    res.status(400).json({ error: "confirmation must be confirmed | not_completed | outside_inndos" });
    return;
  }

  const [tx] = await db
    .select()
    .from(propertyTransactions)
    .where(eq(propertyTransactions.id, req.params.id));

  if (!tx) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  const isOwner = tx.ownerId === userId;
  const isTenant = tx.tenantId === userId;
  if (!isOwner && !isTenant) {
    res.status(403).json({ error: "Not a party to this transaction" });
    return;
  }

  const nowTs = new Date();

  // Update the correct confirmation field
  const updateData: Record<string, unknown> = {};
  if (isOwner) {
    updateData.ownerConfirmation = confirmation;
    updateData.ownerConfirmedAt = nowTs;
  } else {
    updateData.tenantConfirmation = confirmation;
    updateData.tenantConfirmedAt = nowTs;
  }

  const newOwnerConf = isOwner ? confirmation : (tx.ownerConfirmation as ConfirmationValue);
  const newTenantConf = isTenant ? confirmation : (tx.tenantConfirmation as ConfirmationValue);
  const newStatus = computeStatus(newOwnerConf, newTenantConf, tx.transactionType as "rental" | "sale");
  updateData.status = newStatus;

  const [updated] = await db
    .update(propertyTransactions)
    .set(updateData)
    .where(eq(propertyTransactions.id, req.params.id))
    .returning();

  const baseUrl = getBaseUrl();
  const dashboardUrl = `${baseUrl}/#/dashboard`;

  // If fully resolved, update property and notify both parties
  if (newStatus === "rented_via_inndos" || newStatus === "sold_via_inndos") {
    // Mark property as sold so it is excluded from public search
    if (newStatus === "sold_via_inndos") {
      await db
        .update(properties)
        .set({ propertyStatus: "sold" as const })
        .where(eq(properties.id, tx.propertyId));
    }

    // Notify both parties of full confirmation
    const message =
      newStatus === "sold_via_inndos"
        ? `🎉 "${tx.propertyTitle}" has been marked as Sold via inndos. Transaction fully confirmed.`
        : `🎉 "${tx.propertyTitle}" has been marked as Rented via inndos. Transaction fully confirmed.`;

    for (const uid of [tx.ownerId, tx.tenantId]) {
      try {
        await db.insert(notifications).values({
          userId: uid,
          type: "transaction_confirmed",
          message,
          isRead: false,
        });
        const [u] = await db.select({ phone: users.phone, email: users.email, name: users.name }).from(users).where(eq(users.id, uid));
        if (u?.phone) sendSms(u.phone, message).catch(() => {});
        if (u?.email) {
          sendTransactionConfirmationEmail({
            toEmail: u.email,
            toName: u.name ?? "User",
            propertyTitle: tx.propertyTitle,
            transactionType: tx.transactionType as "rental" | "sale",
            eventType: "confirmed",
            status: newStatus,
            dashboardUrl,
          }).catch(() => {});
        }
      } catch { /* non-fatal */ }
    }
  } else if (newStatus === "disputed") {
    // Notify the other party and admins
    const otherId = isOwner ? tx.tenantId : tx.ownerId;
    const disputeMsg = `⚠️ Transaction for "${tx.propertyTitle}" has conflicting responses. An admin will review it.`;
    try {
      await db.insert(notifications).values({ userId: otherId, type: "transaction_confirmed", message: disputeMsg, isRead: false });
    } catch { /* non-fatal */ }
    // Notify admins
    try {
      const adminUsers = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
      for (const admin of adminUsers) {
        await db.insert(notifications).values({
          userId: admin.id,
          type: "transaction_confirmed",
          message: `⚠️ Disputed transaction for "${tx.propertyTitle}" needs review.`,
          isRead: false,
        });
      }
    } catch { /* non-fatal */ }
  }

  res.json(updated);
});

// ─── GET /api/admin/transactions ──────────────────────────────────────────────
router.get("/admin", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const [caller] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
  if (caller?.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }

  const rows = await db
    .select({
      tx: propertyTransactions,
      ownerName: users.name,
    })
    .from(propertyTransactions)
    .leftJoin(users, eq(propertyTransactions.ownerId, users.id))
    .orderBy(desc(propertyTransactions.createdAt));

  // Enrich with tenant names
  const tenantIds = [...new Set(rows.map(r => r.tx.tenantId))];
  const tenants =
    tenantIds.length > 0
      ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, tenantIds))
      : [];
  const tenantMap = Object.fromEntries(tenants.map(t => [t.id, t.name]));

  res.json(
    rows.map(r => ({
      ...r.tx,
      ownerName: r.ownerName,
      tenantName: tenantMap[r.tx.tenantId] ?? null,
    }))
  );
});

// ─── GET /api/admin/transactions/analytics ────────────────────────────────────
router.get("/admin/analytics", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const [caller] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
  if (caller?.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }

  const rows = await db.select().from(propertyTransactions).orderBy(desc(propertyTransactions.createdAt));

  const confirmedRentals = rows.filter(r => r.status === "rented_via_inndos").length;
  const confirmedSales = rows.filter(r => r.status === "sold_via_inndos").length;
  const pending = rows.filter(r =>
    ["pending_confirmation", "confirmed_by_owner_only", "confirmed_by_tenant_only"].includes(r.status)
  ).length;
  const disputed = rows.filter(r => r.status === "disputed").length;
  const outside = rows.filter(r => r.status === "confirmed_outside_inndos").length;
  const notCompleted = rows.filter(r => r.status === "not_completed").length;

  const confirmedRows = rows.filter(r =>
    r.status === "rented_via_inndos" || r.status === "sold_via_inndos"
  );
  const rentalRows = rows.filter(r => r.status === "rented_via_inndos");
  const saleRows = rows.filter(r => r.status === "sold_via_inndos");

  const totalValue = confirmedRows.reduce((s, r) => s + (r.transactionValue || 0), 0);
  const avgRentalValue = rentalRows.length
    ? Math.round(rentalRows.reduce((s, r) => s + (r.transactionValue || 0), 0) / rentalRows.length)
    : 0;
  const avgSaleValue = saleRows.length
    ? Math.round(saleRows.reduce((s, r) => s + (r.transactionValue || 0), 0) / saleRows.length)
    : 0;
  const highestRental = rentalRows.reduce((max, r) => Math.max(max, r.transactionValue || 0), 0);
  const highestSale = saleRows.reduce((max, r) => Math.max(max, r.transactionValue || 0), 0);
  const linkUpSuccessRate =
    rows.length > 0 ? Math.round(((confirmedRentals + confirmedSales) / rows.length) * 100) : 0;

  // Monthly breakdown (last 6 months)
  const now = new Date();
  const monthlyData: { month: string; rentals: number; sales: number; value: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
    const monthRows = confirmedRows.filter(r => {
      const cd = new Date(r.createdAt);
      return cd.getFullYear() === d.getFullYear() && cd.getMonth() === d.getMonth();
    });
    monthlyData.push({
      month: label,
      rentals: monthRows.filter(r => r.status === "rented_via_inndos").length,
      sales: monthRows.filter(r => r.status === "sold_via_inndos").length,
      value: monthRows.reduce((s, r) => s + (r.transactionValue || 0), 0),
    });
  }

  res.json({
    total: rows.length,
    confirmedRentals,
    confirmedSales,
    pending,
    disputed,
    outside,
    notCompleted,
    totalValue,
    avgRentalValue,
    avgSaleValue,
    highestRental,
    highestSale,
    linkUpSuccessRate,
    monthlyData,
  });
});

// ─── POST /api/admin/transactions/:id/resolve ─────────────────────────────────
router.post("/admin/:id/resolve", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const [caller] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
  if (caller?.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }

  const { status, adminNotes } = req.body as { status: TxStatus; adminNotes?: string };
  const validStatuses: TxStatus[] = [
    "fully_confirmed", "cancelled", "not_completed", "confirmed_outside_inndos",
    "sold_via_inndos", "rented_via_inndos",
  ];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: "Invalid status for admin resolution" });
    return;
  }

  const [tx] = await db.select().from(propertyTransactions).where(eq(propertyTransactions.id, req.params.id));
  if (!tx) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  const [updated] = await db
    .update(propertyTransactions)
    .set({
      status,
      adminResolvedBy: userId,
      adminResolvedAt: new Date(),
      adminNotes: adminNotes ?? null,
    })
    .where(eq(propertyTransactions.id, req.params.id))
    .returning();

  const baseUrl = getBaseUrl();
  const message = `Admin has resolved the transaction for "${tx.propertyTitle}" → ${status.replace(/_/g, " ")}.`;

  for (const uid of [tx.ownerId, tx.tenantId]) {
    try {
      await db.insert(notifications).values({ userId: uid, type: "transaction_confirmed", message, isRead: false });
      const [u] = await db.select({ phone: users.phone }).from(users).where(eq(users.id, uid));
      if (u?.phone) sendSms(u.phone, message).catch(() => {});
    } catch { /* non-fatal */ }
  }

  res.json(updated);
});

export default router;
