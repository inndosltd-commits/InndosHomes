import { Router } from "express";
import { db } from "@workspace/db";
import { bookings, properties, users, notifications, insertBookingSchema, propertyTransactions } from "@workspace/db";
import { and, eq, inArray, desc } from "drizzle-orm";
import { sendSms } from "../lib/sms";
import { alias } from "drizzle-orm/pg-core";
import { requireAuth } from "../lib/requireAuth";
import { sendNewBookingEmail, sendBookingStatusEmail, sendGuestCancelledEmail, sendTransactionConfirmationEmail } from "../lib/email";
import { resolveTemplates } from "../lib/templateEngine";
import { getDashboardUrl } from "../lib/appUrl";

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
      propertyVideoPosters: properties.videoPosters,
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
      propertyVideoPosters: properties.videoPosters,
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

  if (startDate >= endDate) {
    res.status(400).json({ error: "The end date must be after the start date." });
    return;
  }

  const outcome = await db.transaction(async (tx) => {
    const [prop] = await tx.select().from(properties).where(eq(properties.id, propertyId)).for("update");
    if (!prop) return { kind: "not-found" as const };
    if (!prop.isVerified || prop.propertyStatus !== "approved") return { kind: "not-public" as const };
    if (prop.ownerId === userId) return { kind: "own-property" as const };

    const [booking] = await tx
      .insert(bookings)
      .values({ propertyId, userId, startDate, endDate, totalPrice, status: "pending" })
      .returning();

    return { kind: "created" as const, prop, booking };
  });

  if (outcome.kind === "not-found") {
    res.status(404).json({ error: "Property not found" });
    return;
  }
  if (outcome.kind === "own-property") {
    res.status(403).json({ error: "You cannot link up your own property." });
    return;
  }
  if (outcome.kind === "not-public") {
    res.status(409).json({ error: "This property is not currently available for new link-ups." });
    return;
  }
  const { booking, prop } = outcome;

  const [guest] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, userId));
  const guestName = guest?.name ?? "A guest";

  try {
    const bkVars = { guestName, propertyTitle: prop.title, startDate, endDate, dashboardUrl: getDashboardUrl() };
    const bkTmpl = await resolveTemplates(
      ["booking.new.owner.bell", "booking.new.owner.sms", "booking.new.admin.bell", "booking.new.admin.sms"],
      bkVars,
      {
        "booking.new.owner.bell": `${guestName} sent a link-up request for "${prop.title}".`,
        "booking.new.owner.sms":  `${guestName} sent a link-up request for "${prop.title}".`,
        "booking.new.admin.bell": `New link-up request: ${guestName} for "${prop.title}".`,
        "booking.new.admin.sms":  `New link-up request: ${guestName} for "${prop.title}".`,
      }
    );
    await db.insert(notifications).values({
      userId: prop.ownerId,
      type: "new_booking",
      message: bkTmpl["booking.new.owner.bell"],
      bookingId: booking.id,
      isRead: false,
    });
    const [ownerUser] = await db.select({ phone: users.phone }).from(users).where(eq(users.id, prop.ownerId));
    if (ownerUser?.phone) {
      sendSms(ownerUser.phone, bkTmpl["booking.new.owner.sms"]).catch((e: unknown) =>
        req.log.error({ e }, "Owner booking SMS failed")
      );
    }

    // Notify all admins of the new booking
    const adminUsers = await db.select({ id: users.id, phone: users.phone }).from(users).where(eq(users.role, "admin"));
    for (const admin of adminUsers) {
      await db.insert(notifications).values({
        userId: admin.id,
        type: "new_booking",
        message: bkTmpl["booking.new.admin.bell"],
        bookingId: booking.id,
        isRead: false,
      });
      if (admin.phone) {
        sendSms(admin.phone, bkTmpl["booking.new.admin.sms"]).catch((e: unknown) =>
          req.log.error({ e }, "Admin booking SMS failed")
        );
      }
    }
  } catch (err) {
    req.log.error({ err, bookingId: booking.id }, "Failed to create booking notifications");
  }

  try {
    const [owner] = await db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, prop.ownerId));

    if (owner) {
      await sendNewBookingEmail({
        ownerEmail: owner.email,
        ownerName: owner.name,
        guestName,
        propertyTitle: prop.title,
        startDate,
        endDate,
        dashboardUrl: getDashboardUrl(),
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
    const cancelVars = {
      guestName,
      propertyTitle: booking.propertyTitle ?? "your property",
      startDate: booking.startDate,
      endDate: booking.endDate,
      dashboardUrl: getDashboardUrl(),
    };
    const cancelTmpl = await resolveTemplates(
      ["booking.cancelled.owner.bell", "booking.cancelled.owner.sms", "booking.cancelled.admin.bell", "booking.cancelled.admin.sms"],
      cancelVars,
      {
        "booking.cancelled.owner.bell": `${guestName} cancelled their link-up for "${booking.propertyTitle}" (${booking.startDate} → ${booking.endDate}).`,
        "booking.cancelled.owner.sms":  `${guestName} cancelled their link-up for "${booking.propertyTitle}" (${booking.startDate} → ${booking.endDate}).`,
        "booking.cancelled.admin.bell": `${guestName} cancelled their link-up for "${booking.propertyTitle}" (${booking.startDate} → ${booking.endDate}).`,
        "booking.cancelled.admin.sms":  `${guestName} cancelled their link-up for "${booking.propertyTitle}" (${booking.startDate} → ${booking.endDate}).`,
      }
    );

    if (booking.ownerId) {
      await db.insert(notifications).values({
        userId: booking.ownerId,
        type: "booking_cancelled_by_guest",
        message: cancelTmpl["booking.cancelled.owner.bell"],
        bookingId: booking.id,
        isRead: false,
      });
      const [ownerUser] = await db.select({ phone: users.phone, email: users.email, name: users.name }).from(users).where(eq(users.id, booking.ownerId));
      if (ownerUser?.phone) {
        sendSms(ownerUser.phone, cancelTmpl["booking.cancelled.owner.sms"]).catch((e: unknown) =>
          req.log.error({ e }, "Owner cancel SMS failed")
        );
      }
      if (ownerUser?.email && booking.propertyTitle) {
        sendGuestCancelledEmail({
          ownerEmail: ownerUser.email,
          ownerName: ownerUser.name ?? "",
          guestName,
          propertyTitle: booking.propertyTitle,
          startDate: booking.startDate,
          endDate: booking.endDate,
          dashboardUrl: getDashboardUrl(),
        }).catch((e: unknown) => req.log.error({ e }, "Owner cancel email failed"));
      }
    }

    // Also notify admins
    const adminUsers2 = await db.select({ id: users.id, phone: users.phone }).from(users).where(eq(users.role, "admin"));
    for (const admin of adminUsers2) {
      await db.insert(notifications).values({
        userId: admin.id,
        type: "booking_cancelled_by_guest",
        message: cancelTmpl["booking.cancelled.admin.bell"],
        bookingId: booking.id,
        isRead: false,
      });
      if (admin.phone) {
        sendSms(admin.phone, cancelTmpl["booking.cancelled.admin.sms"]).catch((e: unknown) =>
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
      startDate: bookings.startDate,
      endDate: bookings.endDate,
      totalPrice: bookings.totalPrice,
      ownerId: properties.ownerId,
      propertyId: properties.id,
      propertyTitle: properties.title,
      propertyAddress: properties.address,
      propertyType: properties.type,
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

  const isConfirmed = status === "confirmed";
  const statusTmplKey = isConfirmed ? "booking.confirmed.guest" : "booking.declined.guest";
  const statusVars = {
    guestName: "there",
    propertyTitle: booking.propertyTitle,
    startDate: booking.startDate ?? "",
    endDate: booking.endDate ?? "",
    dashboardUrl: getDashboardUrl(),
  };
  const statusTmpl = await resolveTemplates(
    [`${statusTmplKey}.bell`, `${statusTmplKey}.sms`],
    statusVars,
    {
      [`${statusTmplKey}.bell`]: `Your link-up for "${booking.propertyTitle}" has been ${isConfirmed ? "confirmed" : "declined"}.`,
      [`${statusTmplKey}.sms`]:  `inndos: Your link-up for "${booking.propertyTitle}" has been ${isConfirmed ? "confirmed" : "declined"}.`,
    }
  );
  const notificationMessage = statusTmpl[`${statusTmplKey}.bell`];

  try {
    await db.insert(notifications).values({
      userId: booking.guestId,
      type: isConfirmed ? "booking_confirmed" : "booking_cancelled",
      message: notificationMessage,
      bookingId: booking.id,
      isRead: false,
    });
    const [guestUser] = await db.select({ phone: users.phone, email: users.email, name: users.name }).from(users).where(eq(users.id, booking.guestId));
    if (guestUser?.phone) {
      sendSms(guestUser.phone, statusTmpl[`${statusTmplKey}.sms`]).catch((e: unknown) =>
        req.log.error({ e }, "Guest booking SMS failed")
      );
    }
    // Send guest email for confirmed / declined
    if (guestUser?.email) {
      sendBookingStatusEmail({
        guestEmail: guestUser.email,
        guestName: guestUser.name ?? "Guest",
        propertyTitle: booking.propertyTitle,
        status: status as "confirmed" | "cancelled",
        dashboardUrl: getDashboardUrl(),
      }).catch((e: unknown) => req.log.error({ e }, "Guest status email failed"));
    }
  } catch (err) {
    req.log.error({ err, bookingId: booking.id }, "Failed to create guest notification for booking status update");
  }

  // When owner confirms a link-up, auto-create a Transaction Confirmation record
  if (status === "confirmed") {
    try {
      const txType = booking.propertyType === "sale" ? "rental" : "rental"; // sale listings use booking too
      const realTxType: "rental" | "sale" = booking.propertyType === "sale" ? "sale" : "rental";

      // Check if a transaction already exists for this booking
      const [existing] = await db
        .select({ id: propertyTransactions.id })
        .from(propertyTransactions)
        .where(eq(propertyTransactions.bookingId, booking.id));

      if (!existing) {
        await db.insert(propertyTransactions).values({
          bookingId: booking.id,
          propertyId: booking.propertyId,
          ownerId: booking.ownerId,
          tenantId: booking.guestId,
          transactionType: realTxType,
          propertyTitle: booking.propertyTitle,
          propertyAddress: booking.propertyAddress,
          transactionValue: booking.totalPrice,
          ownerConfirmation: "pending",
          tenantConfirmation: "pending",
          status: "pending_confirmation",
        });

        const dashboardUrl = getDashboardUrl();
        const promptMsg = `Please confirm your ${realTxType} for "${booking.propertyTitle}" via your dashboard.`;

        // Notify both owner and tenant to confirm
        for (const uid of [booking.ownerId, booking.guestId]) {
          await db.insert(notifications).values({
            userId: uid,
            type: "transaction_confirmation_prompt",
            message: promptMsg,
            bookingId: booking.id,
            isRead: false,
          }).catch(() => {});
        }

        // SMS + email prompts (fire-and-forget)
        const [ownerUser] = await db.select({ phone: users.phone, email: users.email, name: users.name }).from(users).where(eq(users.id, booking.ownerId));
        const [guestUser2] = await db.select({ phone: users.phone, email: users.email, name: users.name }).from(users).where(eq(users.id, booking.guestId));

        for (const u of [ownerUser, guestUser2]) {
          if (!u) continue;
          if (u.phone) sendSms(u.phone, promptMsg).catch(() => {});
          if (u.email) {
            sendTransactionConfirmationEmail({
              toEmail: u.email,
              toName: u.name ?? "User",
              propertyTitle: booking.propertyTitle,
              transactionType: realTxType,
              eventType: "prompt",
              dashboardUrl,
            }).catch(() => {});
          }
        }

        req.log.info({ bookingId: booking.id }, "Transaction confirmation record created");
      }
    } catch (txErr) {
      req.log.error({ txErr, bookingId: booking.id }, "Failed to create transaction confirmation record");
    }
  }

  res.json(updated);
});

// ─── GET /api/bookings/admin — admin sees all bookings/link-ups ────────────────
router.get("/admin", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const [caller] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
  if (caller?.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }

  const guests = alias(users, "guests");
  const owners = alias(users, "owners");

  const rows = await db
    .select({
      id: bookings.id,
      status: bookings.status,
      startDate: bookings.startDate,
      endDate: bookings.endDate,
      totalPrice: bookings.totalPrice,
      createdAt: bookings.createdAt,
      propertyTitle: properties.title,
      propertyType: properties.type,
      propertyAddress: properties.address,
      guestName: guests.name,
      guestEmail: guests.email,
      ownerName: owners.name,
    })
    .from(bookings)
    .leftJoin(properties, eq(bookings.propertyId, properties.id))
    .leftJoin(guests, eq(bookings.userId, guests.id))
    .leftJoin(owners, eq(properties.ownerId, owners.id))
    .orderBy(desc(bookings.createdAt));

  res.json(rows);
});

export default router;
