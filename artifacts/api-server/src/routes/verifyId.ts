import { Router } from "express";
import sharp from "sharp";
import { requireAuth } from "../lib/requireAuth";
import { ObjectStorageService } from "../lib/objectStorage";
import { db } from "@workspace/db";
import { users } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();
const objectStorageService = new ObjectStorageService();

const AI_TIMEOUT_MS = 30_000;

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
    const baseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
    const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

    // Promise.race with a plain setTimeout — this ALWAYS fires and completes the
    // async function, even if the underlying fetch hangs indefinitely on the
    // production AI proxy. AbortSignal.timeout / SDK timeout both failed to
    // cancel the hanging TCP connection; Promise.race guarantees the handler exits.
    const fetchPromise = fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        max_completion_tokens: 2048,
        messages: [
          {
            role: "system",
            content:
              'You are an automated ID verification system. Reply ONLY with valid JSON (no markdown): {"isKenyanId":bool,"extractedName":"string","reason":"string"}. ' +
              'isKenyanId is true if the image shows a Kenyan National ID card (front or back). ' +
              'Front side: "JAMHURI YA KENYA"/"REPUBLIC OF KENYA" header with ID number, date of birth, holder photo. ' +
              'Back side: MRZ lines starting with "IDKYA" and/or district/division/location fields. ' +
              'extractedName: the printed full name from the FULL NAMES field, or MRZ line 3 with < replaced by spaces. ' +
              'If the name is not clearly readable, return empty string. reason is one sentence. ' +
              'Accept any photo quality — blurry, angled, or low-resolution images of genuine IDs are acceptable.',
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Is this a valid Kenyan National ID? Extract the name if visible." },
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${imageBase64}` },
              },
            ],
          },
        ],
      }),
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(Object.assign(new Error("AI_TIMEOUT"), { isAiTimeout: true })),
        AI_TIMEOUT_MS,
      )
    );

    const aiResponse = await Promise.race([fetchPromise, timeoutPromise]);

    if (!aiResponse.ok) {
      throw new Error(`AI service returned ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json() as { choices: Array<{ message: { content: string } }> };
    const raw = aiData.choices[0]?.message?.content ?? "{}";
    aiResult = JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch (err: unknown) {
    req.log.error({ err }, "AI vision call failed or timed out");
    const isTimeout =
      err instanceof Error &&
      ((err as any).isAiTimeout === true ||
        err.name === "TimeoutError" ||
        err.name === "AbortError" ||
        (err as any).message === "AI_TIMEOUT");
    res.status(500).json({
      ok: false,
      message: isTimeout
        ? "Verification timed out. Please try again — it usually takes 10–30 seconds."
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
