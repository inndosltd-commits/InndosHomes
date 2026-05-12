import { Router } from "express";
import { db } from "@workspace/db";
import { properties, users, insertPropertySchema } from "@workspace/db";
import { eq, and, ilike, or } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";

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
  description: properties.description,
  isVerified: properties.isVerified,
  tags: properties.tags,
  lat: properties.lat,
  lng: properties.lng,
  createdAt: properties.createdAt,
  ownerName: users.name,
} as const;

const VALID_TYPES: PropertyType[] = ["rent", "sale", "bnb", "hotel", "hostel"];

function isValidType(t: string): t is PropertyType {
  return VALID_TYPES.includes(t as PropertyType);
}

router.get("/", async (req, res) => {
  const { type, search, ownerId } = req.query as Record<string, string>;

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

  const rows = conditions.length > 0
    ? await baseQuery.where(and(...conditions))
    : await baseQuery;

  res.json(rows);
});

router.get("/:id", async (req, res) => {
  const [prop] = await db
    .select(PROPERTY_COLUMNS)
    .from(properties)
    .leftJoin(users, eq(properties.ownerId, users.id))
    .where(eq(properties.id, req.params.id));

  if (!prop) {
    res.status(404).json({ error: "Property not found" });
    return;
  }

  res.json(prop);
});

router.post("/", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const result = insertPropertySchema.safeParse({ ...req.body, ownerId: userId });
  if (!result.success) {
    res.status(400).json({ error: "Invalid input", details: result.error.flatten() });
    return;
  }

  const [prop] = await db.insert(properties).values(result.data).returning();
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

  const updateSchema = insertPropertySchema.omit({ ownerId: true }).partial();
  const result = updateSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Invalid input", details: result.error.flatten() });
    return;
  }

  const [updated] = await db
    .update(properties)
    .set(result.data)
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
