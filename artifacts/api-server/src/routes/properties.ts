import { Router } from "express";
import { db } from "@workspace/db";
import { properties, users } from "@workspace/db";
import { eq, and, ilike, or } from "drizzle-orm";
import { verifyToken } from "./auth";

const router = Router();

router.get("/", async (req, res) => {
  const { type, search, ownerId } = req.query as Record<string, string>;

  let query = db
    .select({
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
      isVerified: properties.isVerified,
      tags: properties.tags,
      lat: properties.lat,
      lng: properties.lng,
      createdAt: properties.createdAt,
      ownerName: users.name,
    })
    .from(properties)
    .leftJoin(users, eq(properties.ownerId, users.id));

  const conditions = [];
  if (type) conditions.push(eq(properties.type, type as any));
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
    ? await query.where(and(...conditions))
    : await query;

  res.json(rows);
});

router.get("/:id", async (req, res) => {
  const [prop] = await db
    .select({
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
      isVerified: properties.isVerified,
      tags: properties.tags,
      lat: properties.lat,
      lng: properties.lng,
      createdAt: properties.createdAt,
      ownerName: users.name,
    })
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
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const payload = verifyToken(authHeader.slice(7));
  if (!payload) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  const {
    title, type, price, address, beds, baths, sqft,
    guests, image, isVerified, tags, lat, lng,
  } = req.body;

  const [prop] = await db
    .insert(properties)
    .values({
      ownerId: payload.userId,
      title,
      type,
      price,
      address,
      beds: beds ?? 0,
      baths: baths ?? 0,
      sqft: sqft ?? 0,
      guests,
      image: image || "/images/modern_apartment_exterior.png",
      isVerified: isVerified ?? false,
      tags: tags ?? [],
      lat,
      lng,
    })
    .returning();

  res.status(201).json(prop);
});

router.delete("/:id", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const payload = verifyToken(authHeader.slice(7));
  if (!payload) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  const [prop] = await db
    .select()
    .from(properties)
    .where(eq(properties.id, req.params.id));

  if (!prop) {
    res.status(404).json({ error: "Property not found" });
    return;
  }

  if (prop.ownerId !== payload.userId) {
    res.status(403).json({ error: "Not your property" });
    return;
  }

  await db.delete(properties).where(eq(properties.id, req.params.id));
  res.json({ success: true });
});

export default router;
