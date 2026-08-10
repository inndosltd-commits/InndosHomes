import { Router } from "express";
import { db } from "@workspace/db";
import { users, bookings, favorites, propertyTransactions, properties } from "@workspace/db";
import { eq, count, sum, and, sql } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";

const router = Router();

router.get("/", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
  if (!user || !["tenant", "guest", "owner", "host"].includes(user.role)) {
    return res.status(403).json({ error: "Access required" });
  }

  // --- My Bookings ---
  const [totalBookingsRes, confirmedRes, cancelledRes, pendingRes, spentRes] = await Promise.all([
    db.select({ count: count() }).from(bookings).where(eq(bookings.userId, userId)),
    db.select({ count: count() }).from(bookings).where(and(eq(bookings.userId, userId), eq(bookings.status, "confirmed"))),
    db.select({ count: count() }).from(bookings).where(and(eq(bookings.userId, userId), eq(bookings.status, "cancelled"))),
    db.select({ count: count() }).from(bookings).where(and(eq(bookings.userId, userId), eq(bookings.status, "pending"))),
    db.select({ total: sum(bookings.totalPrice) }).from(bookings).where(and(eq(bookings.userId, userId), eq(bookings.status, "confirmed"))),
  ]);

  // --- Transactions as tenant ---
  const [txRentedRes, txSoldRes, txPendingRes] = await Promise.all([
    db.select({ count: count() }).from(propertyTransactions).where(and(eq(propertyTransactions.tenantId, userId), eq(propertyTransactions.status, "rented_via_inndos"))),
    db.select({ count: count() }).from(propertyTransactions).where(and(eq(propertyTransactions.tenantId, userId), eq(propertyTransactions.status, "sold_via_inndos"))),
    db.select({ count: count() }).from(propertyTransactions).where(and(eq(propertyTransactions.tenantId, userId), eq(propertyTransactions.status, "pending_confirmation"))),
  ]);

  // --- Favorites ---
  const [favCount] = await db.select({ count: count() }).from(favorites).where(eq(favorites.userId, userId)).catch(() => [{ count: 0 }]);

  // --- Recent bookings with property details ---
  const recentBookings = await db
    .select({
      id: bookings.id,
      status: bookings.status,
      startDate: bookings.startDate,
      endDate: bookings.endDate,
      totalPrice: bookings.totalPrice,
      createdAt: bookings.createdAt,
      propertyTitle: properties.title,
      propertyAddress: properties.address,
      propertyType: properties.type,
    })
    .from(bookings)
    .leftJoin(properties, eq(bookings.propertyId, properties.id))
    .where(eq(bookings.userId, userId))
    .orderBy(sql`${bookings.createdAt} DESC`)
    .limit(10);

  // --- Monthly booking trends (last 6 months) ---
  const monthlyBookings = await db.execute(sql`
    SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') as month,
           DATE_TRUNC('month', created_at) as month_date,
           COUNT(*)::int as count,
           COALESCE(SUM(CASE WHEN status='confirmed' THEN total_price ELSE 0 END), 0)::int as spent
    FROM bookings
    WHERE user_id = ${userId}
      AND created_at >= NOW() - INTERVAL '6 months'
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY month_date ASC
  `).then(r => r.rows.map((row: any) => ({ month: row.month, count: Number(row.count), spent: Number(row.spent) })));

  // --- Favorite areas from booking history ---
  const allBookings = await db
    .select({ propertyAddress: properties.address })
    .from(bookings)
    .leftJoin(properties, eq(bookings.propertyId, properties.id))
    .where(eq(bookings.userId, userId));

  const areaCounts: Record<string, number> = {};
  for (const b of allBookings) {
    if (b.propertyAddress) {
      const area = b.propertyAddress.split(",")[0]?.trim() ?? b.propertyAddress;
      areaCounts[area] = (areaCounts[area] ?? 0) + 1;
    }
  }
  const favoriteAreas = Object.entries(areaCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([area, count]) => ({ area, count }));

  const totalBookings = Number(totalBookingsRes[0]?.count ?? 0);
  const totalSpent = Number(spentRes[0]?.total ?? 0);

  res.json({
    totalBookings,
    confirmedBookings: Number(confirmedRes[0]?.count ?? 0),
    cancelledBookings: Number(cancelledRes[0]?.count ?? 0),
    pendingBookings: Number(pendingRes[0]?.count ?? 0),
    totalSpent,
    avgBookingValue: totalBookings > 0 ? Math.round(totalSpent / totalBookings) : 0,
    confirmedRentals: Number(txRentedRes[0]?.count ?? 0),
    confirmedSales: Number(txSoldRes[0]?.count ?? 0),
    pendingTransactions: Number(txPendingRes[0]?.count ?? 0),
    totalFavorites: Number(favCount?.count ?? 0),
    recentBookings,
    monthlyBookings,
    favoriteAreas,
  });
});

export default router;
