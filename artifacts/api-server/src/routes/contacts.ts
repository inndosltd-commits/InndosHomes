import { Router } from "express";
import { db } from "@workspace/db";
import { contactInquiries, insertContactInquirySchema } from "@workspace/db";
import { logger } from "../lib/logger";

const router = Router();

router.post("/contact", async (req, res) => {
  const parsed = insertContactInquirySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid form data", details: parsed.error.flatten() });
    return;
  }

  const inquiry = await db.insert(contactInquiries).values(parsed.data).returning();
  logger.info({ id: inquiry[0]?.id, email: parsed.data.email }, "Contact inquiry received");

  res.json({ ok: true, message: "Message received. We'll get back to you within 24 hours." });
});

export default router;
