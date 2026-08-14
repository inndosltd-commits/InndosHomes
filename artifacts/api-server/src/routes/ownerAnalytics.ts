import { Router } from "express";
import { db } from "@workspace/db";
import { users, properties, bookings, subscriptions, favorites, propertyTransactions } from "@workspace/db";
import { eq, count, sum, and, sql } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";

const router = Router();

router.get("/", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  // Verify owner/host role
  const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
  if (!user || !["owner", "host"].includes(user.role)) {
    return res.status(403).json({ error: "Owner/host access required" });
  }

  // --- Properties ---
  const myProperties = await db
    .select({
      id: properties.id,
      title: properties.title,
      type: properties.type,
      propertyStatus: properties.propertyStatus,
      isVerified: properties.isVerified,
      price: properties.price,
      address: properties.address,
      createdAt: properties.createdAt,
    })
    .from(properties)
    .where(eq(properties.ownerId, userId));

  const totalProperties = myProperties.length;
  const activeProperties = myProperties.filter(p => p.isVerified && p.propertyStatus === "approved").length;
  const pendingProperties = myProperties.filter(p => p.propertyStatus === "pending" || (!p.isVerified && p.propertyStatus !== "approved" && p.propertyStatus !== "sold")).length;
  const soldProperties = myProperties.filter(p => p.propertyStatus === "sold").length;
  const propertiesByType = {
    rent: myProperties.filter(p => p.type === "rent").length,
    sale: myProperties.filter(p => p.type === "sale").length,
    bnb: myProperties.filter(p => p.type === "bnb").length,
    hotel: myProperties.filter(p => p.type === "hotel").length,
    hostel: myProperties.filter(p => p.type === "hostel").length,
  };

  const propertyIds = myProperties.map(p => p.id);

  // --- Bookings on my properties ---
  const [totalBookingsRes, confirmedBookingsRes, cancelledBookingsRes, pendingBookingsRes, revenueRes] =
    await Promise.all([
      db.select({ count: count() }).from(bookings).where(
        propertyIds.length > 0 ? sql`${bookings.propertyId} = ANY(ARRAY[${sql.join(propertyIds.map(id => sql`${id}`), sql`, `)}]::text[])` : sql`false`
      ),
      db.select({ count: count() }).from(bookings).where(
        propertyIds.length > 0
          ? and(sql`${bookings.propertyId} = ANY(ARRAY[${sql.join(propertyIds.map(id => sql`${id}`), sql`, `)}]::text[])`, eq(bookings.status, "confirmed"))
          : sql`false`
      ),
      db.select({ count: count() }).from(bookings).where(
        propertyIds.length > 0
          ? and(sql`${bookings.propertyId} = ANY(ARRAY[${sql.join(propertyIds.map(id => sql`${id}`), sql`, `)}]::text[])`, eq(bookings.status, "cancelled"))
          : sql`false`
      ),
      db.select({ count: count() }).from(bookings).where(
        propertyIds.length > 0
          ? and(sql`${bookings.propertyId} = ANY(ARRAY[${sql.join(propertyIds.map(id => sql`${id}`), sql`, `)}]::text[])`, eq(bookings.status, "pending"))
          : sql`false`
      ),
      db.select({ total: sum(bookings.totalPrice) }).from(bookings).where(
        propertyIds.length > 0
          ? and(sql`${bookings.propertyId} = ANY(ARRAY[${sql.join(propertyIds.map(id => sql`${id}`), sql`, `)}]::text[])`, eq(bookings.status, "confirmed"))
          : sql`false`
      ),
    ]);

  // --- Transactions ---
  const [txRentedRes, txSoldRes, txValueRes, txPendingRes] = await Promise.all([
    db.select({ count: count() }).from(propertyTransactions).where(and(eq(propertyTransactions.ownerId, userId), eq(propertyTransactions.status, "rented_via_inndos"))),
    db.select({ count: count() }).from(propertyTransactions).where(and(eq(propertyTransactions.ownerId, userId), eq(propertyTransactions.status, "sold_via_inndos"))),
    db.select({ total: sum(propertyTransactions.transactionValue) }).from(propertyTransactions).where(
      and(eq(propertyTransactions.ownerId, userId), sql`${propertyTransactions.status} IN ('rented_via_inndos','sold_via_inndos')`)
    ),
    db.select({ count: count() }).from(propertyTransactions).where(and(eq(propertyTransactions.ownerId, userId), eq(propertyTransactions.status, "pending_confirmation"))),
  ]);

  // --- Subscription ---
  const [sub] = await db
    .select({ plan: subscriptions.plan, status: subscriptions.status, endDate: subscriptions.endDate, amountPaid: subscriptions.amountPaid, startDate: subscriptions.startDate })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(sql`created_at DESC`)
    .limit(1);

  // --- Favorites on my properties ---
  const totalFavorites = propertyIds.length > 0
    ? await db.select({ count: count() }).from(favorites).where(
        sql`${favorites.propertyId} = ANY(ARRAY[${sql.join(propertyIds.map(id => sql`${id}`), sql`, `)}]::text[])`
      ).then(r => Number(r[0].count)).catch(() => 0)
    : 0;

  // --- Per-property breakdown ---
  const perProperty = await Promise.all(
    myProperties.map(async (prop) => {
      const [bTotal, bConfirmed, bRev, fCount, txRented, txSold] = await Promise.all([
        db.select({ count: count() }).from(bookings).where(eq(bookings.propertyId, prop.id)),
        db.select({ count: count() }).from(bookings).where(and(eq(bookings.propertyId, prop.id), eq(bookings.status, "confirmed"))),
        db.select({ total: sum(bookings.totalPrice) }).from(bookings).where(and(eq(bookings.propertyId, prop.id), eq(bookings.status, "confirmed"))),
        db.select({ count: count() }).from(favorites).where(eq(favorites.propertyId, prop.id)).catch(() => [{ count: 0 }]),
        db.select({ count: count() }).from(propertyTransactions).where(and(eq(propertyTransactions.propertyId, prop.id), eq(propertyTransactions.status, "rented_via_inndos"))),
        db.select({ count: count() }).from(propertyTransactions).where(and(eq(propertyTransactions.propertyId, prop.id), eq(propertyTransactions.status, "sold_via_inndos"))),
      ]);
      return {
        id: prop.id,
        title: prop.title,
        type: prop.type,
        status: prop.propertyStatus,
        isVerified: prop.isVerified,
        price: prop.price,
        bookings: Number(bTotal[0].count),
        confirmedBookings: Number(bConfirmed[0].count),
        revenue: Number(bRev[0].total ?? 0),
        favorites: Number(fCount[0].count),
        confirmedRentals: Number(txRented[0].count),
        confirmedSales: Number(txSold[0].count),
      };
    })
  );

  // --- Monthly booking trend (last 6 months) ---
  const monthlyBookings = propertyIds.length > 0
    ? await db.execute(sql`
        SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') as month,
               DATE_TRUNC('month', created_at) as month_date,
               COUNT(*)::int as count,
               COALESCE(SUM(CASE WHEN status='confirmed' THEN total_price ELSE 0 END), 0)::int as revenue
        FROM bookings
        WHERE property_id = ANY(ARRAY[${sql.join(propertyIds.map(id => sql`${id}`), sql`, `)}]::text[])
          AND created_at >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month_date ASC
      `).then(r => r.rows.map((row: any) => ({ month: row.month, count: Number(row.count), revenue: Number(row.revenue) })))
    : [];

  res.json({
    totalProperties,
    activeProperties,
    pendingProperties,
    soldProperties,
    propertiesByType,
    totalBookings: Number(totalBookingsRes[0]?.count ?? 0),
    confirmedBookings: Number(confirmedBookingsRes[0]?.count ?? 0),
    cancelledBookings: Number(cancelledBookingsRes[0]?.count ?? 0),
    pendingBookings: Number(pendingBookingsRes[0]?.count ?? 0),
    totalRevenue: Number(revenueRes[0]?.total ?? 0),
    confirmedRentals: Number(txRentedRes[0]?.count ?? 0),
    confirmedSales: Number(txSoldRes[0]?.count ?? 0),
    totalTransactionValue: Number(txValueRes[0]?.total ?? 0),
    pendingLinkUps: Number(txPendingRes[0]?.count ?? 0),
    linkUps: Number(totalBookingsRes[0]?.count ?? 0),
    totalFavorites,
    subscription: sub ?? null,
    properties: perProperty,
    monthlyBookings,
  });
});

export default router;
