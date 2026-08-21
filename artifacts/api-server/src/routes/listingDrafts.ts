import { Router } from "express";
import { db, listingDrafts } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";

const router = Router();
const MAX_DRAFT_BYTES = 1_000_000;

function parseDraftData(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  if (Buffer.byteLength(JSON.stringify(data), "utf8") > MAX_DRAFT_BYTES) return null;
  return data;
}

router.get("/current", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const [draft] = await db
    .select()
    .from(listingDrafts)
    .where(eq(listingDrafts.userId, userId))
    .limit(1);

  if (!draft) {
    res.status(404).json({ error: "No saved listing draft" });
    return;
  }

  res.json(draft);
});

router.put("/current", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const data = parseDraftData(req.body?.data);
  if (!data) {
    res.status(400).json({ error: "Draft data must be an object smaller than 1 MB" });
    return;
  }

  const [draft] = await db
    .insert(listingDrafts)
    .values({ userId, data })
    .onConflictDoUpdate({
      target: listingDrafts.userId,
      set: { data, updatedAt: new Date() },
    })
    .returning();

  res.json(draft);
});

router.delete("/current", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  await db.delete(listingDrafts).where(eq(listingDrafts.userId, userId));
  res.status(204).send();
});

export default router;