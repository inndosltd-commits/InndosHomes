import { Router } from "express";
import { db } from "@workspace/db";
import { bookings, properties, users, notifications, insertBookingSchema } from "@workspace/db";
import { and, eq, lt, gt, inArray } from "drizzle-orm";
import { sendSms } from "../lib/sms";
import { alias } from "drizzle-orm/pg-core";
import { requireAuth } from "../lib/requireAuth";
import { sendNewBookingEmail, sendBookingStatusEmail, sendGuestCancelledEmail } from "../lib/email";

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
      propertyImages: properties.images,
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
      propertyImages: properties.images,
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

  const overlapping = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(
      and(
        eq(bookings.propertyId, propertyId),
        inArray(bookings.status, ["confirmed", "pending"]),
        lt(bookings.startDate, endDate),
        gt(bookings.endDate, startDate)
      )
    );

  const totalUnits = prop.totalUnits ?? 1;
  if (overlapping.length >= totalUnits) {
    const msg = totalUnits > 1
      ? `All ${totalUnits} units are booked for these dates. Please choose different dates.`
      : "These dates are already booked. Please choose different dates.";
    res.status(409).json({ error: msg });
    return;
  }

  const [booking] = await db
    .insert(bookings)
    .values({ propertyId, userId, startDate, endDate, totalPrice, status: "pending" })
    .returning();

  const [guest] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, userId));
  const guestName = guest?.name ?? "A guest";

  try {
    const ownerMsg = `${guestName} linked up "${prop.title}" from ${startDate} to ${endDate}.`;
    await db.insert(notifications).values({
      userId: prop.ownerId,
      type: "new_booking",
      message: ownerMsg,
      bookingId: booking.id,
      isRead: false,
    });
    const [ownerUser] = await db.select({ phone: users.phone }).from(users).where(eq(users.id, prop.ownerId));
    if (ownerUser?.phone) {
      sendSms(ownerUser.phone, ownerMsg).catch((e: unknown) =>
        req.log.error({ e }, "Owner booking SMS failed")
      );
    }
  } catch (err) {
    req.log.error({ err, bookingId: booking.id }, "Failed to create owner notification for booking");
  }

  // Notify all admins of the new booking
  try {
    const adminMsg = `New link-up: ${guestName} booked "${prop.title}" (${startDate} → ${endDate}).`;
    const adminUsers = await db.select({ id: users.id, phone: users.phone }).from(users).where(eq(users.role, "admin"));
    for (const admin of adminUsers) {
      await db.insert(notifications).values({
        userId: admin.id,
        type: "new_booking",
        message: adminMsg,
        bookingId: booking.id,
        isRead: false,
      });
      if (admin.phone) {
        sendSms(admin.phone, adminMsg).catch((e: unknown) =>
          req.log.error({ e }, "Admin booking SMS failed")
        );
      }
    }
  } catch (err) {
    req.log.error({ err, bookingId: booking.id }, "Failed to notify admins of new booking");
  }

  try {
    const [owner] = await db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, prop.ownerId));

    if (owner) {
      const domains = process.env.REPLIT_DOMAINS?.split(",")[0];
      const baseUrl = domains ? `https://${domains}` : "https://inndos.com";
      const dashboardUrl = `${baseUrl}/#/dashboard`;

      await sendNewBookingEmail({
        ownerEmail: owner.email,
        ownerName: owner.name,
        guestName,
        propertyTitle: prop.title,
        startDate,
        endDate,
        dashboardUrl,
      });

      req.log.info({ bookingId: booking.id, ownerEmail: owner.email }, "Booking email sent to owner");
    }
  } catch (err) {
    req.log.error({ err, bookingId: booking.id }, "Failed to send booking email to owner");
  }

  res.status(201).json(booking);
});

router.patch("/:id/cancel", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const [booking] = await db
    .select({
      id: bookings.id,
      userId: bookings.userId,
      propertyId: bookings.propertyId,
      startDate: bookings.startDate,
      endDate: bookings.endDate,
      propertyTitle: properties.title,
      ownerId: properties.ownerId,
    })
    .from(bookings)
    .leftJoin(properties, eq(bookings.propertyId, properties.id))
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

  // Notify owner and admins when a guest cancels
  try {
    const [guest] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId));
    const guestName = guest?.name ?? "A guest";
    const cancelMsg = `${guestName} cancelled their link-up for "${booking.propertyTitle}" (${booking.startDate} → ${booking.endDate}).`;

    if (booking.ownerId) {
      await db.insert(notifications).values({
        userId: booking.ownerId,
        type: "booking_cancelled_by_guest",
        message: cancelMsg,
        bookingId: booking.id,
        isRead: false,
      });
      const [ownerUser] = await db.select({ phone: users.phone, email: users.email, name: users.name }).from(users).where(eq(users.id, booking.ownerId));
      if (ownerUser?.phone) {
        sendSms(ownerUser.phone, cancelMsg).catch((e: unknown) =>
          req.log.error({ e }, "Owner cancel SMS failed")
        );
      }
      if (ownerUser?.email && booking.propertyTitle) {
        const domains = process.env.REPLIT_DOMAINS?.split(",")[0];
        const baseUrl = domains ? `https://${domains}` : "https://inndos.com";
        sendGuestCancelledEmail({
          ownerEmail: ownerUser.email,
          ownerName: ownerUser.name ?? "",
          guestName,
          propertyTitle: booking.propertyTitle,
          startDate: booking.startDate,
          endDate: booking.endDate,
          dashboardUrl: `${baseUrl}/#/dashboard`,
        }).catch((e: unknown) => req.log.error({ e }, "Owner cancel email failed"));
      }
    }

    // Also notify admins
    const adminUsers = await db.select({ id: users.id, phone: users.phone }).from(users).where(eq(users.role, "admin"));
    for (const admin of adminUsers) {
      await db.insert(notifications).values({
        userId: admin.id,
        type: "booking_cancelled_by_guest",
        message: cancelMsg,
        bookingId: booking.id,
        isRead: false,
      });
      if (admin.phone) {
        sendSms(admin.phone, cancelMsg).catch((e: unknown) =>
          req.log.error({ e }, "Admin cancel SMS failed")
        );
      }
    }
  } catch (err) {
    req.log.error({ err, bookingId: booking.id }, "Failed to notify owner/admins of guest cancellation");
  }

  res.json(updated);
});

router.patch("/:id/status", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { status } = req.body;
  if (status !== "confirmed" && status !== "cancelled") {
    res.status(400).json({ error: "Status must be 'confirmed' or 'cancelled'" });
    return;
  }

  const [booking] = await db
    .select({
      id: bookings.id,
      guestId: bookings.userId,
      ownerId: properties.ownerId,
      propertyTitle: properties.title,
    })
    .from(bookings)
    .innerJoin(properties, eq(bookings.propertyId, properties.id))
    .where(eq(bookings.id, req.params.id));

  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  if (booking.ownerId !== userId) {
    res.status(403).json({ error: "Not your property" });
    return;
  }

  const [updated] = await db
    .update(bookings)
    .set({ status })
    .where(eq(bookings.id, req.params.id))
    .returning();

  const statusLabel = status === "confirmed" ? "confirmed" : "declined";
  const notificationMessage = `Your link-up for "${booking.propertyTitle}" has been ${statusLabel}.`;

  try {
    await db.insert(notifications).values({
      userId: booking.guestId,
      type: status === "confirmed" ? "booking_confirmed" : "booking_cancelled",
      message: notificationMessage,
      bookingId: booking.id,
      isRead: false,
    });
    const [guestUser] = await db.select({ phone: users.phone, email: users.email, name: users.name }).from(users).where(eq(users.id, booking.guestId));
    if (guestUser?.phone) {
      sendSms(guestUser.phone, notificationMessage).catch((e: unknown) =>
        req.log.error({ e }, "Guest booking SMS failed")
      );
    }
    // Send guest email for confirmed / declined
    if (guestUser?.email) {
      const domains = process.env.REPLIT_DOMAINS?.split(",")[0];
      const baseUrl = domains ? `https://${domains}` : "https://inndos.com";
      sendBookingStatusEmail({
        guestEmail: guestUser.email,
        guestName: guestUser.name ?? "Guest",
        propertyTitle: booking.propertyTitle,
        status: status as "confirmed" | "cancelled",
        dashboardUrl: `${baseUrl}/#/dashboard`,
      }).catch((e: unknown) => req.log.error({ e }, "Guest status email failed"));
    }
  } catch (err) {
    req.log.error({ err, bookingId: booking.id }, "Failed to create guest notification for booking status update");
  }

  res.json(updated);
});

export default router;
