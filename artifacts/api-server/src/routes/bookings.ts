import { Router } from "express";
import { db } from "@workspace/db";
import { bookings, properties } from "@workspace/db";
import { eq } from "drizzle-orm";
import { verifyToken } from "./auth";

const router = Router();

function requireAuth(req: any, res: any): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Not authenticated" });
    return null;
  }
  const payload = verifyToken(authHeader.slice(7));
  if (!payload) {
    res.status(401).json({ error: "Invalid token" });
    return null;
  }
  return payload.userId;
}

router.get("/", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const rows = await db
    .select({
      id: bookings.id,
      propertyId: bookings.propertyId,
      userId: bookings.userId,
      status: bookings.status,
      startDate: bookings.startDate,
      endDate: bookings.endDate,
      totalPrice: bookings.totalPrice,
      createdAt: bookings.createdAt,
      propertyTitle: properties.title,
      propertyAddress: properties.address,
      propertyImage: properties.image,
      propertyType: properties.type,
    })
    .from(bookings)
    .leftJoin(properties, eq(bookings.propertyId, properties.id))
    .where(eq(bookings.userId, userId));

  res.json(rows);
});

router.post("/", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { propertyId, startDate, endDate, totalPrice } = req.body;
  if (!propertyId || !startDate || !endDate || !totalPrice) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const [prop] = await db
    .select()
    .from(properties)
    .where(eq(properties.id, propertyId));
  if (!prop) {
    res.status(404).json({ error: "Property not found" });
    return;
  }

  const [booking] = await db
    .insert(bookings)
    .values({ propertyId, userId, startDate, endDate, totalPrice, status: "pending" })
    .returning();

  res.status(201).json(booking);
});

router.patch("/:id/cancel", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, req.params.id));

  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  if (booking.userId !== userId) {
    res.status(403).json({ error: "Not your booking" });
    return;
  }

  const [updated] = await db
    .update(bookings)
    .set({ status: "cancelled" })
    .where(eq(bookings.id, req.params.id))
    .returning();

  res.json(updated);
});

export default router;
