import { Router } from "express";
import { db } from "@workspace/db";
import { notifications, bookings, properties, users } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";

const router = Router();

router.get("/", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const rows = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      message: notifications.message,
      bookingId: notifications.bookingId,
      isRead: notifications.isRead,
      createdAt: notifications.createdAt,
      bookingStartDate: bookings.startDate,
      bookingEndDate: bookings.endDate,
      bookingTotalPrice: bookings.totalPrice,
      propertyTitle: properties.title,
      guestName: users.name,
    })
    .from(notifications)
    .leftJoin(bookings, eq(notifications.bookingId, bookings.id))
    .leftJoin(properties, eq(bookings.propertyId, properties.id))
    .leftJoin(users, eq(bookings.userId, users.id))
    .where(eq(notifications.userId, userId))
    .orderBy(notifications.createdAt);

  res.json(rows);
});

router.get("/unread-count", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const rows = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

  res.json({ count: rows.length });
});

router.patch("/:id/read", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const [existing] = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.id, req.params.id), eq(notifications.userId, userId)));

  if (!existing) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }

  const [updated] = await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.id, req.params.id))
    .returning();

  res.json(updated);
});

router.post("/mark-all-read", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

  res.json({ success: true });
});

export default router;
