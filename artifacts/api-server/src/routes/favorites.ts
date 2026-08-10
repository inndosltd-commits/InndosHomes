import { Router } from "express";
import { db } from "@workspace/db";
import { favorites, properties, users, notifications } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
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
      propertyCreatedAt: properties.createdAt,
      ownerName: users.name,
      savedAt: favorites.createdAt,
    })
    .from(favorites)
    .innerJoin(properties, eq(favorites.propertyId, properties.id))
    .leftJoin(users, eq(properties.ownerId, users.id))
    .where(eq(favorites.userId, userId))
    .orderBy(desc(favorites.createdAt));

  res.json(rows);
});

// Owner endpoint — see who liked each of their properties and when
router.get("/my-properties", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const [me] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
  if (!me || !["owner", "host", "admin"].includes(me.role)) {
    res.status(403).json({ error: "Owner/host/admin access required" });
    return;
  }

  // Get all owner's properties
  const myProps = await db
    .select({ id: properties.id, title: properties.title, type: properties.type, price: properties.price, address: properties.address, image: properties.image, isVerified: properties.isVerified, propertyStatus: properties.propertyStatus })
    .from(properties)
    .where(eq(properties.ownerId, userId));

  if (myProps.length === 0) {
    res.json([]);
    return;
  }

  // Get all favorites on those properties with user info
  const propIds = myProps.map(p => p.id);
  const allFavs = await db
    .select({
      propertyId: favorites.propertyId,
      savedAt: favorites.createdAt,
      likerName: users.name,
      likerEmail: users.email,
      likerAvatar: users.avatar,
      likerId: users.id,
    })
    .from(favorites)
    .innerJoin(users, eq(favorites.userId, users.id))
    .where(eq(users.id, favorites.userId))
    .orderBy(desc(favorites.createdAt))
    .then(rows => rows.filter(r => propIds.includes(r.propertyId)));

  // Group by property
  const result = myProps.map(prop => ({
    ...prop,
    totalLikes: allFavs.filter(f => f.propertyId === prop.id).length,
    likedBy: allFavs
      .filter(f => f.propertyId === prop.id)
      .map(f => ({ likerId: f.likerId, likerName: f.likerName, likerEmail: f.likerEmail, likerAvatar: f.likerAvatar, savedAt: f.savedAt })),
  })).sort((a, b) => b.totalLikes - a.totalLikes);

  res.json(result);
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

  // Notify the property owner (skip if the saver IS the owner)
  try {
    const [property] = await db
      .select({ ownerId: properties.ownerId, title: properties.title })
      .from(properties)
      .where(eq(properties.id, propertyId));

    if (property && property.ownerId !== userId) {
      const [saver] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, userId));

      const saverName = saver?.name ?? "Someone";
      await db.insert(notifications).values({
        userId: property.ownerId,
        type: "property_saved",
        message: `${saverName} saved your listing "${property.title}"`,
      });
    }
  } catch {
    // Notification failure should not block the save response
  }

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
