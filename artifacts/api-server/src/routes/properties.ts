import { Router } from "express";
import { db } from "@workspace/db";
import { properties, users, bookings, propertyBlocks, insertPropertySchema, subscriptions } from "@workspace/db";
import { getVideoLimit, getImageLimit, getActiveSubscription, getPlanLimit } from "./subscriptions";
import { eq, and, ilike, or, inArray, count, gte, lte, sql as drizzleSql, isNotNull } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";
import { verifyToken } from "./auth";
import { ObjectNotFoundError, ObjectStorageService } from "../lib/objectStorage";
import sharp from "sharp";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const router = Router();
const objectStorageService = new ObjectStorageService();
const execFileAsync = promisify(execFile);
const MAX_LISTING_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_LISTING_VIDEO_BYTES = 250 * 1024 * 1024;

type PropertyType = "rent" | "sale" | "bnb" | "hotel" | "hostel";

async function validateNewListingMedia({
  paths,
  expectedKind,
  userId,
  existingPaths = new Set<string>(),
}: {
  paths: string[];
  expectedKind: "image" | "video";
  userId: string;
  existingPaths?: Set<string>;
}): Promise<string | null> {
  const ownerPrefix = `/objects/uploads/${userId}/`;
  const maxBytes =
    expectedKind === "image" ? MAX_LISTING_IMAGE_BYTES : MAX_LISTING_VIDEO_BYTES;

  for (const path of paths) {
    if (existingPaths.has(path)) continue;
    if (!path.startsWith(ownerPrefix)) {
      return `A ${expectedKind} is not owned by this account. Please upload it again.`;
    }

    try {
      const inspection = await objectStorageService.inspectObjectEntity(path);
      if (inspection.size < 1 || inspection.size > maxBytes) {
        return `A ${expectedKind} exceeds the ${Math.floor(maxBytes / (1024 * 1024))} MB limit.`;
      }
      if (inspection.mediaKind !== expectedKind) {
        return `A file in the ${expectedKind} list is not a valid ${expectedKind}.`;
      }
      if (expectedKind === "image") {
        const objectFile = await objectStorageService.getObjectEntityFile(path);
        const [imageBytes] = await objectFile.download();
        const metadata = await sharp(imageBytes).metadata();
        if (!metadata.width || !metadata.height || !metadata.format) {
          return "An uploaded image could not be decoded.";
        }
      } else {
        const downloadUrl = await objectStorageService.getObjectEntityDownloadURL(path);
        const { stdout } = await execFileAsync(
          "ffprobe",
          [
            "-v",
            "error",
            "-show_entries",
            "format=format_name,duration",
            "-of",
            "json",
            downloadUrl,
          ],
          { timeout: 30_000, maxBuffer: 1024 * 1024 }
        );
        const probe = JSON.parse(stdout) as {
          format?: { format_name?: string; duration?: string };
        };
        const formats = probe.format?.format_name?.split(",") ?? [];
        const duration = Number(probe.format?.duration ?? 0);
        const isSupportedContainer = formats.some((format) =>
          ["mov", "mp4", "m4a", "3gp", "3g2", "mj2", "matroska", "webm"].includes(format)
        );
        if (!isSupportedContainer || !Number.isFinite(duration) || duration <= 0) {
          return "An uploaded video could not be decoded.";
        }
        if (duration > 300) {
          return "Listing videos must be five minutes or shorter.";
        }
      }
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        return `An uploaded ${expectedKind} could not be found. Please upload it again.`;
      }
      return `An uploaded ${expectedKind} could not be verified. Please upload it again.`;
    }
  }

  return null;
}

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
  details: properties.details,
  description: properties.description,
  isVerified: properties.isVerified,
  propertyStatus: properties.propertyStatus,
  adminComment: properties.adminComment,
  tags: properties.tags,
  subtype: properties.subtype,
  hourlyRate: properties.hourlyRate,
  priceUnit: properties.priceUnit,
  totalUnits: properties.totalUnits,
  lat: properties.lat,
  lng: properties.lng,
  createdAt: properties.createdAt,
  ownerName: users.name,
  ownerPhone: users.phone,
  ownerEmail: users.email,
  ownerAvatar: users.avatar,
  ownerBusinessName: users.businessName,
  avgRating: drizzleSql<string | null>`(SELECT ROUND(AVG(r.rating)::numeric,1)::text FROM reviews r WHERE r.property_id = ${properties.id})`,
  favoritesCount: drizzleSql<number>`(SELECT COUNT(*)::int FROM favorites f WHERE f.property_id = ${properties.id})`,
  activeBookingsCount: drizzleSql<number>`(SELECT COUNT(*)::int FROM bookings b WHERE b.property_id = ${properties.id} AND b.status = 'confirmed')`,
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
  const { type, subtype, search, ownerId, minLat, maxLat, minLng, maxLng } = req.query as Record<string, string>;
  const caller = await getCallerInfo(req);

  const baseQuery = db
    .select(PROPERTY_COLUMNS)
    .from(properties)
    .leftJoin(users, eq(properties.ownerId, users.id));

  const conditions = [];
  if (type && isValidType(type)) conditions.push(eq(properties.type, type));
  if (subtype) conditions.push(ilike(properties.subtype, `%${subtype}%`));
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
    // Exclude sold properties from public search results
    conditions.push(drizzleSql`${properties.propertyStatus} != 'sold'`);
  }

  const rows = conditions.length > 0
    ? await baseQuery.where(and(...conditions))
    : await baseQuery;

  res.json(rows);
});

// ── Lister search ─────────────────────────────────────────────────────────────
// Returns users who have an active paid subscription (non-free) AND at least
// one verified, non-sold property. Only these listers are searchable by name.
router.get("/listers", async (req, res) => {
  try {
    const q       = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const today   = new Date().toISOString().slice(0, 10);
    const pattern = `%${q}%`;

    const rows = await db.execute(drizzleSql`
      SELECT u.id, u.name, u.avatar,
             MAX(s.plan) AS plan,
             COUNT(DISTINCT p.id)::integer AS "propertyCount"
      FROM users u
      INNER JOIN subscriptions s
        ON  s."userId" = u.id
        AND s.status   = 'active'
        AND s.plan    != 'free'
        AND s."endDate" >= ${today}
      INNER JOIN properties p
        ON  p."ownerId"       = u.id
        AND p."isVerified"    = true
        AND p."propertyStatus" != 'sold'
      WHERE u.name ILIKE ${pattern}
      GROUP BY u.id, u.name, u.avatar
      ORDER BY u.name
      LIMIT 20
    `);

    res.json((rows as any).rows ?? rows);
  } catch (err) {
    console.error("Lister search error:", err);
    res.status(500).json({ error: "Failed to load listers" });
  }
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

  // Sold properties are hidden from public — owner and admin can still view them
  if (prop.propertyStatus === "sold" && !isOwner && !isAdmin) {
    res.status(410).json({ error: "This property has been sold", sold: true });
    return;
  }

  res.json(prop);
});

router.get("/:id/availability", async (req, res) => {
  const caller = await getCallerInfo(req);

  const [prop] = await db
    .select({ id: properties.id, propertyStatus: properties.propertyStatus, ownerId: properties.ownerId })
    .from(properties)
    .where(eq(properties.id, req.params.id));

  if (!prop) {
    res.status(404).json({ error: "Property not found" });
    return;
  }

  const isOwner = caller.userId && caller.userId === prop.ownerId;
  const isAdmin = caller.role === "admin";
  if (prop.propertyStatus === "sold" && !isOwner && !isAdmin) {
    res.status(410).json({ error: "This property has been sold", sold: true });
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

  if (!startDate || !endDate || startDate >= endDate) {
    res.status(400).json({ error: "The block end date must be after the start date" });
    return;
  }

  const [caller] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
  const outcome = await db.transaction(async (tx) => {
    // Use the same per-property lock as booking creation. Whichever operation
    // obtains the lock first is re-checked before the other can proceed.
    await tx.execute(
      drizzleSql`SELECT pg_advisory_xact_lock(hashtextextended(${req.params.id}, 0))`
    );

    const [prop] = await tx
      .select({ ownerId: properties.ownerId })
      .from(properties)
      .where(eq(properties.id, req.params.id));
    if (!prop) return { kind: "not-found" as const };
    if (prop.ownerId !== userId && caller?.role !== "admin") {
      return { kind: "forbidden" as const };
    }

    const [activeBooking] = await tx
      .select({ id: bookings.id })
      .from(bookings)
      .where(
        and(
          eq(bookings.propertyId, req.params.id),
          inArray(bookings.status, ["pending", "confirmed"]),
          drizzleSql`${bookings.startDate} < ${endDate}`,
          drizzleSql`${bookings.endDate} > ${startDate}`
        )
      )
      .limit(1);
    if (activeBooking) return { kind: "booked" as const };

    const [block] = await tx
      .insert(propertyBlocks)
      .values({ propertyId: req.params.id, startDate, endDate, reason: reason ?? null })
      .returning();
    return { kind: "created" as const, block };
  });

  if (outcome.kind === "not-found") {
    res.status(404).json({ error: "Property not found" });
    return;
  }
  if (outcome.kind === "forbidden") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  if (outcome.kind === "booked") {
    res.status(409).json({ error: "These dates already contain an active booking." });
    return;
  }

  res.status(201).json(outcome.block);
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
    const plan = sub?.plan ?? "free";
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
    const plan = sub?.plan ?? "free";

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

  const imageValidationError = await validateNewListingMedia({
    paths: imageList.length > 0
      ? imageList
      : primaryImage.startsWith("/objects/")
        ? [primaryImage]
        : [],
    expectedKind: "image",
    userId,
  });
  if (imageValidationError) {
    res.status(400).json({ error: imageValidationError, code: "INVALID_MEDIA" });
    return;
  }
  const videoValidationError = await validateNewListingMedia({
    paths: videoList,
    expectedKind: "video",
    userId,
  });
  if (videoValidationError) {
    res.status(400).json({ error: videoValidationError, code: "INVALID_MEDIA" });
    return;
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
    const plan = sub?.plan ?? "free";

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

  const existingMediaPaths = new Set([
    prop.image,
    ...(prop.images ?? []),
    ...(prop.videos ?? []),
  ]);
  const imagePathsToValidate = imageList !== undefined
    ? imageList
    : typeof body.image === "string" && body.image.startsWith("/objects/")
      ? [body.image]
      : [];
  const imageValidationError = await validateNewListingMedia({
    paths: imagePathsToValidate,
    expectedKind: "image",
    userId,
    existingPaths: existingMediaPaths,
  });
  if (imageValidationError) {
    res.status(400).json({ error: imageValidationError, code: "INVALID_MEDIA" });
    return;
  }
  const videoValidationError = await validateNewListingMedia({
    paths: videoList ?? [],
    expectedKind: "video",
    userId,
    existingPaths: existingMediaPaths,
  });
  if (videoValidationError) {
    res.status(400).json({ error: videoValidationError, code: "INVALID_MEDIA" });
    return;
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
