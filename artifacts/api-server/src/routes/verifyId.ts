import { Router } from "express";
import { requireAuth } from "../lib/requireAuth";
import { ObjectStorageService } from "../lib/objectStorage";
import { openai } from "@workspace/integrations-openai-ai-server";
import { db } from "@workspace/db";
import { users } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();
const objectStorageService = new ObjectStorageService();

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ");
}

function namesOverlap(registeredName: string, idName: string): boolean {
  const regParts = registeredName
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 1);

  const idParts = idName
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 1);

  const matches = regParts.filter(w => idParts.includes(w));
  return matches.length >= Math.min(2, Math.min(regParts.length, idParts.length));
}

router.post("/auth/verify-id", requireAuth, async (req, res) => {
  const userId = (req as any).user?.userId as string;
  const { objectPath } = req.body as { objectPath?: string };

  if (!objectPath || typeof objectPath !== "string") {
    res.status(400).json({ ok: false, message: "objectPath is required" });
    return;
  }

  const [user] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId));
  if (!user) {
    res.status(401).json({ ok: false, message: "User not found" });
    return;
  }

  let imageBase64: string;
  let mimeType = "image/jpeg";

  try {
    const file = await objectStorageService.getObjectEntityFile(objectPath);
    const response = await objectStorageService.downloadObject(file);
    const ct = response.headers.get("content-type");
    if (ct) mimeType = ct.split(";")[0].trim();

    const arrayBuffer = await response.arrayBuffer();
    imageBase64 = Buffer.from(arrayBuffer).toString("base64");
  } catch (err) {
    req.log.error({ err }, "Failed to read ID image from storage");
    res.status(500).json({ ok: false, message: "Could not read the uploaded image. Please try again." });
    return;
  }

  let aiResult: {
    isKenyanId: boolean;
    confidence: string;
    extractedName: string;
    reason: string;
  };

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5",
      max_completion_tokens: 512,
      messages: [
        {
          role: "system",
          content: `You are an identity document verification system for Kenya. 
Your job is to analyse an uploaded image and determine:
1. Whether the image is a genuine Kenyan National Identity Card (issued by the Government of Kenya).
2. The full name printed on the card.

A genuine Kenyan National ID typically has:
- The words "REPUBLIC OF KENYA" or "JAMHURI YA KENYA" 
- The words "NATIONAL IDENTITY CARD" or "KITAMBULISHO CHA TAIFA"
- Fields for: ID Number, Full Name, Date of Birth, Date of Issue, District of Birth/Issuance
- A photo of the holder
- Greenish or beige background with security patterns

Respond ONLY with valid JSON in this exact shape — no markdown, no extra text:
{
  "isKenyanId": true | false,
  "confidence": "high" | "medium" | "low",
  "extractedName": "<full name from card or empty string>",
  "reason": "<one sentence explaining your decision>"
}`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyse this image and tell me if it is a valid Kenyan National Identity Card. If yes, extract the full name printed on it.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
                detail: "high",
              },
            },
          ],
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    aiResult = JSON.parse(cleaned);
  } catch (err) {
    req.log.error({ err }, "OpenAI vision call failed");
    res.status(500).json({ ok: false, message: "AI verification service is temporarily unavailable. Please try again." });
    return;
  }

  if (!aiResult.isKenyanId) {
    res.json({
      ok: false,
      isKenyanId: false,
      namesMatch: false,
      extractedName: "",
      message: `This does not appear to be a valid Kenyan National ID. ${aiResult.reason} Please upload only your official Kenyan National Identity Card.`,
    });
    return;
  }

  const nameMatches = namesOverlap(user.name, aiResult.extractedName);

  if (!nameMatches) {
    res.json({
      ok: false,
      isKenyanId: true,
      namesMatch: false,
      extractedName: aiResult.extractedName,
      message: `The name on the ID ("${aiResult.extractedName}") does not match your registered account name ("${user.name}"). Please upload an ID that matches your account name.`,
    });
    return;
  }

  res.json({
    ok: true,
    isKenyanId: true,
    namesMatch: true,
    extractedName: aiResult.extractedName,
    message: `Identity verified successfully. Name on ID: ${aiResult.extractedName}`,
  });
});

export default router;
