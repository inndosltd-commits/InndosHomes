import { Router } from "express";
import { db } from "@workspace/db";
import { users, properties, bookings } from "@workspace/db";
import { eq, count, sum, ne, asc } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";

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
    .set({ isVerified: true })
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

export default router;
