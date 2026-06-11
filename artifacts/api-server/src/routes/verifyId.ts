import { Router } from "express";
import sharp from "sharp";
import { requireAuth } from "../lib/requireAuth";
import { ObjectStorageService } from "../lib/objectStorage";
import { openai } from "@workspace/integrations-openai-ai-server";
import { db } from "@workspace/db";
import { users } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();
const objectStorageService = new ObjectStorageService();

const AI_TIMEOUT_MS = 20_000;

function namesOverlap(registeredName: string, idName: string): boolean {
  if (!idName.trim()) return true; // model confirmed ID but declined to print name — trust it
  const clean = (s: string) =>
    s.toLowerCase().replace(/[^a-z\s]/g, "").trim().split(/\s+/).filter(w => w.length > 1);
  const regParts = clean(registeredName);
  const idParts = clean(idName);
  if (regParts.length === 0 || idParts.length === 0) return false;
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
  const mimeType = "image/jpeg";

  try {
    const file = await objectStorageService.getObjectEntityFile(objectPath);
    const response = await objectStorageService.downloadObject(file);
    const arrayBuffer = await response.arrayBuffer();
    // Resize to max 512px — minimises base64 payload to ~30-80KB
    const resized = await sharp(Buffer.from(arrayBuffer))
      .resize({ width: 512, height: 512, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 75 })
      .toBuffer();
    imageBase64 = resized.toString("base64");
    req.log.info({ originalBytes: arrayBuffer.byteLength, resizedBytes: resized.length }, "ID image resized");
  } catch (err) {
    req.log.error({ err }, "Failed to read ID image from storage");
    res.status(500).json({ ok: false, message: "Could not read the uploaded image. Please try again." });
    return;
  }

  let aiResult: { isKenyanId: boolean; extractedName: string; reason: string };

  try {
    // Pass timeout + maxRetries=0 directly to the SDK so it aborts at the
    // HTTP level — Promise.race alone cannot cancel an in-flight SDK request.
    const completion = await openai.chat.completions.create(
      {
        model: "gpt-5-mini",
        max_completion_tokens: 2048,
        messages: [
          {
            role: "system",
            content:
              'You are an ID verification system. Reply ONLY with valid JSON (no markdown): {"isKenyanId":bool,"extractedName":"string","reason":"string"}. ' +
              'isKenyanId is true if the image shows either side of a Kenyan National ID card. ' +
              'Front side: "JAMHURI YA KENYA"/"REPUBLIC OF KENYA" header with ID number, date of birth, holder photo. ' +
              'Back side: MRZ lines starting with "IDKYA" and/or district/division/location fields. Either qualifies. ' +
              'extractedName is the full name (front: FULL NAMES field; back: third MRZ line after removing < chars), or empty string if not visible. reason is one sentence.',
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Is this a valid Kenyan National ID? Extract the name." },
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${imageBase64}` },
              },
            ],
          },
        ],
      },
      {
        timeout: AI_TIMEOUT_MS,
        maxRetries: 0,
      }
    );
    const raw = completion.choices[0]?.message?.content ?? "{}";
    aiResult = JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch (err: unknown) {
    req.log.error({ err }, "OpenAI vision call failed or timed out");
    // OpenAI SDK throws APIConnectionTimeoutError on timeout; also handle legacy AbortError name
    const isTimeout =
      err instanceof Error &&
      (err.name === "APIConnectionTimeoutError" ||
        err.name === "AbortError" ||
        err.constructor?.name === "APIConnectionTimeoutError" ||
        (err as any).code === "ETIMEDOUT");
    res.status(500).json({
      ok: false,
      message: isTimeout
        ? "Verification timed out. Please try again with a clear, well-lit photo."
        : "AI verification service is temporarily unavailable. Please try again.",
    });
    return;
  }

  if (!aiResult.isKenyanId) {
    res.json({
      ok: false,
      isKenyanId: false,
      namesMatch: false,
      extractedName: "",
      message: `Not a valid Kenyan National ID. ${aiResult.reason ?? ""} Please upload only your official Kenyan National Identity Card.`,
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
      message: `Name on ID ("${aiResult.extractedName}") does not match your account name ("${user.name}"). Upload an ID that matches your account name.`,
    });
    return;
  }

  res.json({
    ok: true,
    isKenyanId: true,
    namesMatch: true,
    extractedName: aiResult.extractedName,
    message: `Verified. Name on ID: ${aiResult.extractedName}`,
  });
});

export default router;
