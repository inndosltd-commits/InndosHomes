import { Router } from "express";
import { db } from "@workspace/db";
import { bookings, properties, users, insertBookingSchema } from "@workspace/db";
import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { requireAuth } from "../lib/requireAuth";

const router = Router();

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

router.get("/received", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const guests = alias(users, "guests");

  const rows = await db
    .select({
      id: bookings.id,
      propertyId: bookings.propertyId,
      propertyTitle: properties.title,
      propertyAddress: properties.address,
      propertyImage: properties.image,
      guestId: bookings.userId,
      guestName: guests.name,
      status: bookings.status,
      startDate: bookings.startDate,
      endDate: bookings.endDate,
      totalPrice: bookings.totalPrice,
      createdAt: bookings.createdAt,
    })
    .from(bookings)
    .innerJoin(properties, eq(bookings.propertyId, properties.id))
    .leftJoin(guests, eq(bookings.userId, guests.id))
    .where(eq(properties.ownerId, userId));

  res.json(rows);
});

router.post("/", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const result = insertBookingSchema.safeParse({ ...req.body, userId });
  if (!result.success) {
    res.status(400).json({ error: "Invalid input", details: result.error.flatten() });
    return;
  }

  const { propertyId, startDate, endDate, totalPrice } = result.data;

  const [prop] = await db.select().from(properties).where(eq(properties.id, propertyId));
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

  const [booking] = await db.select().from(bookings).where(eq(bookings.id, req.params.id));

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
