import { Router } from "express";
import { db } from "@workspace/db";
import { favorites, properties, users } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";

const router = Router();

router.get("/", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const rows = await db
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
      images: properties.images,
      description: properties.description,
      isVerified: properties.isVerified,
      tags: properties.tags,
      lat: properties.lat,
      lng: properties.lng,
      createdAt: properties.createdAt,
      ownerName: users.name,
    })
    .from(favorites)
    .innerJoin(properties, eq(favorites.propertyId, properties.id))
    .leftJoin(users, eq(properties.ownerId, users.id))
    .where(eq(favorites.userId, userId));

  res.json(rows);
});

router.post("/", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { propertyId } = req.body as { propertyId?: string };
  if (!propertyId) {
    res.status(400).json({ error: "propertyId is required" });
    return;
  }

  const [existing] = await db
    .select()
    .from(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.propertyId, propertyId)));

  if (existing) {
    res.status(409).json({ error: "Already in favorites" });
    return;
  }

  await db.insert(favorites).values({ userId, propertyId });

  res.status(201).json({ isFavorited: true, propertyId });
});

router.get("/check/:propertyId", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { propertyId } = req.params;
  const [existing] = await db
    .select()
    .from(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.propertyId, propertyId)));

  res.json({ isFavorited: !!existing, propertyId });
});

router.delete("/:propertyId", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { propertyId } = req.params;

  const [existing] = await db
    .select()
    .from(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.propertyId, propertyId)));

  if (!existing) {
    res.status(404).json({ error: "Not in favorites" });
    return;
  }

  await db
    .delete(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.propertyId, propertyId)));

  res.json({ isFavorited: false, propertyId });
});

export default router;
