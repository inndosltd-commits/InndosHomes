import { Router } from "express";
import { db } from "@workspace/db";
import { reviews, reviewReplies, bookings, properties, users, notifications } from "@workspace/db";
import { eq, and, desc, avg, count, inArray } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";

const router = Router();

// ── GET /api/reviews/property/:propertyId ─────────────────────────────────────
// Public: all reviews for a given property (includes owner reply if any)
router.get("/property/:propertyId", async (req, res) => {
  const { propertyId } = req.params;

  const rows = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      reviewerName: users.name,
      reviewerAvatar: users.avatar,
    })
    .from(reviews)
    .innerJoin(users, eq(reviews.reviewerId, users.id))
    .where(eq(reviews.propertyId, propertyId))
    .orderBy(desc(reviews.createdAt));

  const [agg] = await db
    .select({ avg: avg(reviews.rating), total: count(reviews.id) })
    .from(reviews)
    .where(eq(reviews.propertyId, propertyId));

  // Fetch replies for all reviews in one query
  const reviewIds = rows.map((r) => r.id);
  const repliesMap: Record<string, { reply: string; createdAt: Date }> = {};
  if (reviewIds.length > 0) {
    const replyRows = await db
      .select({ reviewId: reviewReplies.reviewId, reply: reviewReplies.reply, createdAt: reviewReplies.createdAt })
      .from(reviewReplies)
      .where(inArray(reviewReplies.reviewId, reviewIds));
    for (const rr of replyRows) {
      repliesMap[rr.reviewId] = { reply: rr.reply, createdAt: rr.createdAt };
    }
  }

  res.json({
    reviews: rows.map((r) => ({ ...r, ownerReply: repliesMap[r.id] ?? null })),
    averageRating: agg?.avg ? parseFloat(Number(agg.avg).toFixed(1)) : null,
    totalReviews: agg?.total ?? 0,
  });
});

// ── GET /api/reviews/check/:bookingId ─────────────────────────────────────────
// Auth: has the current user already reviewed this booking?
router.get("/check/:bookingId", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const { bookingId } = req.params;
  const [existing] = await db
    .select({ id: reviews.id, rating: reviews.rating, comment: reviews.comment })
    .from(reviews)
    .where(and(eq(reviews.bookingId, bookingId), eq(reviews.reviewerId, userId)));
  res.json({ hasReviewed: !!existing, review: existing ?? null });
});

// ── GET /api/reviews/owner ────────────────────────────────────────────────────
// Auth (owner/host/admin): all reviews for the current owner's properties
router.get("/owner", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const [me] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
  if (!me || !["owner", "host", "admin"].includes(me.role)) {
    res.status(403).json({ error: "Owner/host/admin access required" });
    return;
  }

  // Get all properties belonging to this owner
  const myProps = await db
    .select({ id: properties.id, title: properties.title, image: properties.image })
    .from(properties)
    .where(eq(properties.ownerId, userId));

  if (myProps.length === 0) {
    res.json({ reviews: [], perProperty: [] });
    return;
  }

  const propIds = myProps.map((p) => p.id);

  const rows = await db
    .select({
      id: reviews.id,
      propertyId: reviews.propertyId,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      reviewerName: users.name,
      reviewerAvatar: users.avatar,
    })
    .from(reviews)
    .innerJoin(users, eq(reviews.reviewerId, users.id))
    .where(inArray(reviews.propertyId, propIds))
    .orderBy(desc(reviews.createdAt));

  // Fetch replies for owner's reviews
  const reviewIds = rows.map((r) => r.id);
  const repliesMap: Record<string, { reply: string; createdAt: Date }> = {};
  if (reviewIds.length > 0) {
    const replyRows = await db
      .select({ reviewId: reviewReplies.reviewId, reply: reviewReplies.reply, createdAt: reviewReplies.createdAt })
      .from(reviewReplies)
      .where(inArray(reviewReplies.reviewId, reviewIds));
    for (const rr of replyRows) {
      repliesMap[rr.reviewId] = { reply: rr.reply, createdAt: rr.createdAt };
    }
  }

  const rowsWithReplies = rows.map((r) => ({ ...r, ownerReply: repliesMap[r.id] ?? null }));

  // Per-property summary
  const perProperty = myProps.map((p) => {
    const propReviews = rows.filter((r) => r.propertyId === p.id);
    const avgRating =
      propReviews.length > 0
        ? parseFloat(
            (propReviews.reduce((s, r) => s + r.rating, 0) / propReviews.length).toFixed(1)
          )
        : null;
    return {
      propertyId: p.id,
      propertyTitle: p.title,
      propertyImage: p.image,
      averageRating: avgRating,
      totalReviews: propReviews.length,
    };
  });

  const overallAvg =
    rows.length > 0
      ? parseFloat((rows.reduce((s, r) => s + r.rating, 0) / rows.length).toFixed(1))
      : null;

  res.json({ reviews: rowsWithReplies, perProperty, overallAvg, totalReviews: rows.length });
});

// ── POST /api/reviews ─────────────────────────────────────────────────────────
// Auth (tenant/guest): submit a review. Must have a confirmed booking.
router.post("/", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { bookingId, rating, comment } = req.body as {
    bookingId?: string;
    rating?: number;
    comment?: string;
  };

  if (!bookingId || !rating || rating < 1 || rating > 5) {
    res.status(400).json({ error: "bookingId and a rating between 1–5 are required" });
    return;
  }

  // Verify the booking belongs to this user and is confirmed
  const [booking] = await db
    .select({ id: bookings.id, status: bookings.status, userId: bookings.userId, propertyId: bookings.propertyId })
    .from(bookings)
    .where(eq(bookings.id, bookingId));

  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  if (booking.userId !== userId) {
    res.status(403).json({ error: "You can only review your own bookings" });
    return;
  }
  if (booking.status !== "confirmed") {
    res.status(400).json({ error: "You can only review confirmed link-ups" });
    return;
  }

  // Check for duplicate review on this booking
  const [existing] = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(and(eq(reviews.bookingId, bookingId), eq(reviews.reviewerId, userId)));

  if (existing) {
    res.status(409).json({ error: "You have already reviewed this link-up" });
    return;
  }

  const [inserted] = await db
    .insert(reviews)
    .values({
      propertyId: booking.propertyId,
      reviewerId: userId,
      bookingId,
      rating,
      comment: comment?.trim() || null,
    })
    .returning();

  // Notify property owner
  try {
    const [prop] = await db
      .select({ ownerId: properties.ownerId, title: properties.title })
      .from(properties)
      .where(eq(properties.id, booking.propertyId));

    const [reviewer] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, userId));

    if (prop && prop.ownerId !== userId) {
      const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
      await db.insert(notifications).values({
        userId: prop.ownerId,
        type: "review_received",
        message: `${reviewer?.name ?? "A guest"} left a ${stars} review on "${prop.title}"`,
      });
    }
  } catch {
    // Notification failure should not block the response
  }

  res.status(201).json(inserted);
});

// ── GET /api/reviews/admin ────────────────────────────────────────────────────
// Auth (admin): all reviews across the platform with reviewer and property info
router.get("/admin", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const [me] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
  if (!me || me.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const rows = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      propertyId: reviews.propertyId,
      propertyTitle: properties.title,
      reviewerName: users.name,
      reviewerEmail: users.email,
    })
    .from(reviews)
    .innerJoin(users, eq(reviews.reviewerId, users.id))
    .innerJoin(properties, eq(reviews.propertyId, properties.id))
    .orderBy(desc(reviews.createdAt));

  res.json({ reviews: rows, total: rows.length });
});

// ── POST /api/reviews/:reviewId/reply ────────────────────────────────────────
// Auth (owner/host): post or update an owner reply. One reply per review max.
router.post("/:reviewId/reply", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { reviewId } = req.params;
  const { reply } = req.body as { reply?: string };

  if (!reply?.trim()) {
    res.status(400).json({ error: "Reply text is required" });
    return;
  }

  // Load the review and its property to verify ownership
  const [review] = await db
    .select({ id: reviews.id, propertyId: reviews.propertyId })
    .from(reviews)
    .where(eq(reviews.id, reviewId));

  if (!review) {
    res.status(404).json({ error: "Review not found" });
    return;
  }

  const [prop] = await db
    .select({ ownerId: properties.ownerId })
    .from(properties)
    .where(eq(properties.id, review.propertyId));

  if (!prop || prop.ownerId !== userId) {
    // Allow admins too
    const [me] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
    if (!me || me.role !== "admin") {
      res.status(403).json({ error: "Only the property owner can reply to this review" });
      return;
    }
  }

  // Upsert: one reply per review
  const [existing] = await db
    .select({ id: reviewReplies.id })
    .from(reviewReplies)
    .where(eq(reviewReplies.reviewId, reviewId));

  if (existing) {
    const [updated] = await db
      .update(reviewReplies)
      .set({ reply: reply.trim(), createdAt: new Date() })
      .where(eq(reviewReplies.reviewId, reviewId))
      .returning();
    res.json(updated);
  } else {
    const [inserted] = await db
      .insert(reviewReplies)
      .values({ reviewId, ownerId: userId, reply: reply.trim() })
      .returning();
    res.status(201).json(inserted);
  }
});

// ── DELETE /api/reviews/:reviewId ─────────────────────────────────────────────
// Auth: reviewer or admin can delete their own review
router.delete("/:reviewId", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { reviewId } = req.params;
  const [me] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));

  const [review] = await db.select().from(reviews).where(eq(reviews.id, reviewId));
  if (!review) {
    res.status(404).json({ error: "Review not found" });
    return;
  }
  if (review.reviewerId !== userId && me?.role !== "admin") {
    res.status(403).json({ error: "Not authorised" });
    return;
  }

  await db.delete(reviews).where(eq(reviews.id, reviewId));
  res.json({ deleted: true });
});

export default router;
