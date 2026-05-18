import { Router } from "express";
import { db } from "@workspace/db";
import { properties, users, insertPropertySchema } from "@workspace/db";
import { eq, and, ilike, or } from "drizzle-orm";
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
  description: properties.description,
  isVerified: properties.isVerified,
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
  const { type, search, ownerId } = req.query as Record<string, string>;
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

router.post("/", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { isVerified: _ignored, ...body } = req.body;
  const imageList: string[] = Array.isArray(body.images) ? body.images : [];
  const primaryImage = imageList[0] || body.image || "/images/modern_apartment_exterior.png";
  const result = insertPropertySchema.safeParse({ ...body, images: imageList, image: primaryImage, ownerId: userId });
  if (!result.success) {
    res.status(400).json({ error: "Invalid input", details: result.error.flatten() });
    return;
  }

  const [prop] = await db.insert(properties).values({ ...result.data, isVerified: false }).returning();
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

  if (prop.ownerId !== userId) {
    res.status(403).json({ error: "Not your property" });
    return;
  }

  const sentKeys = new Set(Object.keys(req.body));
  const { isVerified: _ignored, ...body } = req.body;
  const imageList: string[] | undefined = Array.isArray(body.images) ? body.images : undefined;
  const patchBody = {
    ...body,
    ...(imageList !== undefined ? { images: imageList, image: imageList[0] || body.image || "/images/modern_apartment_exterior.png" } : {}),
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
