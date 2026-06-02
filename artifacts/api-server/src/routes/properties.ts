import { Router } from "express";
import { db } from "@workspace/db";
import { properties, users, bookings, propertyBlocks, insertPropertySchema } from "@workspace/db";
import { getVideoLimit, getImageLimit, getActiveSubscription, getPlanLimit } from "./subscriptions";
import { eq, and, ilike, or, inArray, count, gte, lte, sql as drizzleSql, isNotNull } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";
import { verifyToken } from "./auth";

const router = Router();

type PropertyType = "rent" | "sale" | "bnb" | "hotel" | "hostel";

const PROPERTY_COLUMNS = {
  id: properties.id,
  ownerId: properties.ownerId,
  title: properties.title,
  type: properties.type,
  price: properties.price,
  address: properties.address,
  beds: properties.beds,
  baths: properties.baths,
  sqft: properties.sqft,
  guests: properties.guests,
  image: properties.image,
  images: properties.images,
  videos: properties.videos,
  description: properties.description,
  isVerified: properties.isVerified,
  propertyStatus: properties.propertyStatus,
  adminComment: properties.adminComment,
  tags: properties.tags,
  subtype: properties.subtype,
  hourlyRate: properties.hourlyRate,
  lat: properties.lat,
  lng: properties.lng,
  createdAt: properties.createdAt,
  ownerName: users.name,
} as const;

const VALID_TYPES: PropertyType[] = ["rent", "sale", "bnb", "hotel", "hostel"];

function isValidType(t: string): t is PropertyType {
  return VALID_TYPES.includes(t as PropertyType);
}

async function getCallerInfo(req: Parameters<typeof requireAuth>[0]): Promise<{ userId: string | null; role: string | null }> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return { userId: null, role: null };
  const payload = verifyToken(authHeader.slice(7));
  if (!payload) return { userId: null, role: null };
  const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, payload.userId));
  return { userId: payload.userId, role: user?.role ?? null };
}

router.get("/", async (req, res) => {
  const { type, search, ownerId, minLat, maxLat, minLng, maxLng } = req.query as Record<string, string>;
  const caller = await getCallerInfo(req);

  const baseQuery = db
    .select(PROPERTY_COLUMNS)
    .from(properties)
    .leftJoin(users, eq(properties.ownerId, users.id));

  const conditions = [];
  if (type && isValidType(type)) conditions.push(eq(properties.type, type));
  if (ownerId) conditions.push(eq(properties.ownerId, ownerId));
  if (search) {
    conditions.push(
      or(
        ilike(properties.title, `%${search}%`),
        ilike(properties.address, `%${search}%`)
      )!
    );
  }

  const bboxRaw = [minLat, maxLat, minLng, maxLng];
  const bboxValues = bboxRaw.map(Number);
  const hasBBox = bboxRaw.every((v) => v !== undefined && v !== "") &&
    bboxValues.every((v) => !isNaN(v));
  if (hasBBox) {
    const [minLatN, maxLatN, minLngN, maxLngN] = bboxValues;
    conditions.push(
      and(
        isNotNull(properties.lat),
        isNotNull(properties.lng),
        gte(drizzleSql`CAST(${properties.lat} AS DOUBLE PRECISION)`, minLatN),
        lte(drizzleSql`CAST(${properties.lat} AS DOUBLE PRECISION)`, maxLatN),
        gte(drizzleSql`CAST(${properties.lng} AS DOUBLE PRECISION)`, minLngN),
        lte(drizzleSql`CAST(${properties.lng} AS DOUBLE PRECISION)`, maxLngN),
      )!
    );
  }

  const isOwnerQuery = ownerId && ownerId === caller.userId;
  const isAdmin = caller.role === "admin";
  if (!isAdmin && !isOwnerQuery) {
    conditions.push(eq(properties.isVerified, true));
  }

  const rows = conditions.length > 0
    ? await baseQuery.where(and(...conditions))
    : await baseQuery;

  res.json(rows);
});

router.get("/:id", async (req, res) => {
  const caller = await getCallerInfo(req);

  const [prop] = await db
    .select(PROPERTY_COLUMNS)
    .from(properties)
    .leftJoin(users, eq(properties.ownerId, users.id))
    .where(eq(properties.id, req.params.id));

  if (!prop) {
    res.status(404).json({ error: "Property not found" });
    return;
  }

  const isOwner = caller.userId && caller.userId === prop.ownerId;
  const isAdmin = caller.role === "admin";
  if (!prop.isVerified && !isOwner && !isAdmin) {
    res.status(404).json({ error: "Property not found" });
    return;
  }

  res.json(prop);
});

router.get("/:id/availability", async (req, res) => {
  const [prop] = await db
    .select({ id: properties.id })
    .from(properties)
    .where(eq(properties.id, req.params.id));

  if (!prop) {
    res.status(404).json({ error: "Property not found" });
    return;
  }

  const [bookingRows, blockRows] = await Promise.all([
    db
      .select({
        startDate: bookings.startDate,
        endDate: bookings.endDate,
        status: bookings.status,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.propertyId, req.params.id),
          inArray(bookings.status, ["pending", "confirmed"])
        )
      ),
    db
      .select({
        startDate: propertyBlocks.startDate,
        endDate: propertyBlocks.endDate,
      })
      .from(propertyBlocks)
      .where(eq(propertyBlocks.propertyId, req.params.id)),
  ]);

  const blocks = blockRows.map(b => ({ ...b, status: "blocked" as const }));
  res.json([...bookingRows, ...blocks]);
});

router.get("/:id/blocks", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const [prop] = await db
    .select({ ownerId: properties.ownerId })
    .from(properties)
    .where(eq(properties.id, req.params.id));

  if (!prop) { res.status(404).json({ error: "Property not found" }); return; }

  const [caller] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
  if (prop.ownerId !== userId && caller?.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const blocks = await db
    .select()
    .from(propertyBlocks)
    .where(eq(propertyBlocks.propertyId, req.params.id))
    .orderBy(propertyBlocks.startDate);

  res.json(blocks);
});

router.post("/:id/blocks", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { startDate, endDate, reason } = req.body as {
    startDate?: string;
    endDate?: string;
    reason?: string;
  };

  if (!startDate || !endDate || startDate > endDate) {
    res.status(400).json({ error: "Valid startDate and endDate are required" });
    return;
  }

  const [prop] = await db
    .select({ ownerId: properties.ownerId })
    .from(properties)
    .where(eq(properties.id, req.params.id));

  if (!prop) { res.status(404).json({ error: "Property not found" }); return; }

  const [caller] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
  if (prop.ownerId !== userId && caller?.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [block] = await db
    .insert(propertyBlocks)
    .values({ propertyId: req.params.id, startDate, endDate, reason: reason ?? null })
    .returning();

  res.status(201).json(block);
});

router.delete("/:id/blocks/:blockId", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const [prop] = await db
    .select({ ownerId: properties.ownerId })
    .from(properties)
    .where(eq(properties.id, req.params.id));

  if (!prop) { res.status(404).json({ error: "Property not found" }); return; }

  const [caller] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
  if (prop.ownerId !== userId && caller?.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db
    .delete(propertyBlocks)
    .where(
      and(
        eq(propertyBlocks.id, req.params.blockId),
        eq(propertyBlocks.propertyId, req.params.id)
      )
    );

  res.json({ success: true });
});

router.post("/", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const [caller] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
  const allowedRoles = ["owner", "host", "admin"];
  if (!caller || !allowedRoles.includes(caller.role)) {
    res.status(403).json({ error: "Only owners and hosts can create property listings" });
    return;
  }

  if (caller.role !== "admin") {
    const sub = await getActiveSubscription(userId);
    const plan = sub?.plan ?? "standard";
    const limit = getPlanLimit(plan);
    const [{ listingCount }] = await db
      .select({ listingCount: count() })
      .from(properties)
      .where(eq(properties.ownerId, userId));
    if (Number(listingCount) >= limit) {
      res.status(403).json({
        error: `Your ${plan} plan allows a maximum of ${limit} listing${limit === 1 ? "" : "s"}. Please upgrade your subscription to add more.`,
        code: "SUBSCRIPTION_LIMIT",
        plan,
        limit,
      });
      return;
    }
  }

  const { isVerified: _ignored, ...body } = req.body;
  const imageList: string[] = Array.isArray(body.images) ? body.images : [];
  const videoList: string[] = Array.isArray(body.videos) ? body.videos : [];
  const primaryImage = imageList[0] || body.image || "/images/modern_apartment_exterior.png";

  if (caller.role !== "admin") {
    const sub = await getActiveSubscription(userId);
    const plan = sub?.plan ?? "standard";

    const imageLimit = getImageLimit(plan);
    if (imageList.length > imageLimit) {
      res.status(403).json({
        error: `Your ${plan} plan allows a maximum of ${imageLimit} photo${imageLimit === 1 ? "" : "s"} per listing. Please remove some images or upgrade your subscription.`,
        code: "IMAGE_LIMIT",
        plan,
        imageLimit,
      });
      return;
    }

    const videoLimit = getVideoLimit(plan);
    if (videoList.length > videoLimit) {
      res.status(403).json({
        error: `Your ${plan} plan allows a maximum of ${videoLimit} video${videoLimit === 1 ? "" : "s"} per listing. Please upgrade your subscription.`,
        code: "VIDEO_LIMIT",
        plan,
        videoLimit,
      });
      return;
    }
  }

  const result = insertPropertySchema.safeParse({ ...body, images: imageList, videos: videoList, image: primaryImage, ownerId: userId });
  if (!result.success) {
    res.status(400).json({ error: "Invalid input", details: result.error.flatten() });
    return;
  }

  const { propertyStatus: _ps, adminComment: _ac, ...insertData } = result.data;
  const [prop] = await db.insert(properties).values({ ...insertData, isVerified: false }).returning();
  res.status(201).json(prop);
});

router.patch("/:id", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const [prop] = await db.select().from(properties).where(eq(properties.id, req.params.id));

  if (!prop) {
    res.status(404).json({ error: "Property not found" });
    return;
  }

  const [callerUser] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
  const isCallerAdmin = callerUser?.role === "admin";

  if (prop.ownerId !== userId && !isCallerAdmin) {
    res.status(403).json({ error: "Not your property" });
    return;
  }

  const sentKeys = new Set(Object.keys(req.body));
  const { isVerified: _ignored, ...body } = req.body;
  const imageList: string[] | undefined = Array.isArray(body.images) ? body.images : undefined;
  const videoList: string[] | undefined = Array.isArray(body.videos) ? body.videos : undefined;

  if ((imageList !== undefined || videoList !== undefined) && !isCallerAdmin) {
    const sub = await getActiveSubscription(userId);
    const plan = sub?.plan ?? "standard";

    if (imageList !== undefined) {
      const imageLimit = getImageLimit(plan);
      if (imageList.length > imageLimit) {
        res.status(403).json({
          error: `Your ${plan} plan allows a maximum of ${imageLimit} photo${imageLimit === 1 ? "" : "s"} per listing. Please remove some images or upgrade your subscription.`,
          code: "IMAGE_LIMIT",
          plan,
          imageLimit,
        });
        return;
      }
    }

    if (videoList !== undefined) {
      const videoLimit = getVideoLimit(plan);
      if (videoList.length > videoLimit) {
        res.status(403).json({
          error: `Your ${plan} plan allows a maximum of ${videoLimit} video${videoLimit === 1 ? "" : "s"} per listing. Please upgrade your subscription.`,
          code: "VIDEO_LIMIT",
          plan,
          videoLimit,
        });
        return;
      }
    }
  }

  const patchBody = {
    ...body,
    ...(imageList !== undefined ? { images: imageList, image: imageList[0] || body.image || "/images/modern_apartment_exterior.png" } : {}),
    ...(videoList !== undefined ? { videos: videoList } : {}),
  };
  const updateSchema = insertPropertySchema.omit({ ownerId: true, isVerified: true }).partial();
  const result = updateSchema.safeParse(patchBody);
  if (!result.success) {
    res.status(400).json({ error: "Invalid input", details: result.error.flatten() });
    return;
  }

  const updatePayload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(result.data)) {
    if (!sentKeys.has(key) || value === undefined) continue;
    const currentValue = prop[key as keyof typeof prop];
    const changed = Array.isArray(value)
      ? JSON.stringify(value) !== JSON.stringify(currentValue)
      : value !== currentValue;
    if (changed) {
      updatePayload[key] = value;
    }
  }

  if (imageList !== undefined && 'images' in updatePayload) {
    const derivedImage = imageList[0] || prop.image || "/images/modern_apartment_exterior.png";
    if (derivedImage !== prop.image) {
      updatePayload.image = derivedImage;
    }
  }

  if (Object.keys(updatePayload).length === 0) {
    res.json(prop);
    return;
  }

  const [updated] = await db
    .update(properties)
    .set(updatePayload)
    .where(eq(properties.id, req.params.id))
    .returning();

  res.json(updated);
});

router.post("/:id/resubmit", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const [prop] = await db.select().from(properties).where(eq(properties.id, req.params.id));
  if (!prop) {
    res.status(404).json({ error: "Property not found" });
    return;
  }
  if (prop.ownerId !== userId) {
    res.status(403).json({ error: "Not your property" });
    return;
  }

  const [updated] = await db
    .update(properties)
    .set({ propertyStatus: "pending", adminComment: null, isVerified: false })
    .where(eq(properties.id, req.params.id))
    .returning();

  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const [prop] = await db.select().from(properties).where(eq(properties.id, req.params.id));

  if (!prop) {
    res.status(404).json({ error: "Property not found" });
    return;
  }

  if (prop.ownerId !== userId) {
    res.status(403).json({ error: "Not your property" });
    return;
  }

  await db.delete(properties).where(eq(properties.id, req.params.id));
  res.json({ success: true });
});

export default router;
