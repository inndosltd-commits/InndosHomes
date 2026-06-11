import { Router } from "express";
import { requireAuth } from "../lib/requireAuth";
import { ObjectStorageService } from "../lib/objectStorage";
import { openai } from "@workspace/integrations-openai-ai-server";
import { db } from "@workspace/db";
import { users } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();
const objectStorageService = new ObjectStorageService();

const AI_TIMEOUT_MS = 25_000;

function namesOverlap(registeredName: string, idName: string): boolean {
  const clean = (s: string) =>
    s.toLowerCase().replace(/[^a-z\s]/g, "").trim().split(/\s+/).filter(w => w.length > 1);
  const regParts = clean(registeredName);
  const idParts = clean(idName);
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

  let aiResult: { isKenyanId: boolean; extractedName: string; reason: string };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    let completion;
    try {
      completion = await openai.chat.completions.create(
        {
          model: "gpt-5.1",
          max_completion_tokens: 256,
          messages: [
            {
              role: "system",
              content:
                'You are an ID verification system. Reply ONLY with valid JSON (no markdown): {"isKenyanId":bool,"extractedName":"string","reason":"string"}. ' +
                'isKenyanId is true only if the image shows a Kenyan National ID card (has "REPUBLIC OF KENYA" or "JAMHURI YA KENYA" and "NATIONAL IDENTITY CARD" text, ID number field, date of birth field, and holder photo). ' +
                "extractedName is the full name printed on the card, or empty string. reason is one sentence.",
            },
            {
              role: "user",
              content: [
                { type: "text", text: "Is this a valid Kenyan National ID? Extract the name." },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mimeType};base64,${imageBase64}`,
                    detail: "low",
                  },
                },
              ],
            },
          ],
        },
        { signal: controller.signal }
      );
    } finally {
      clearTimeout(timer);
    }

    const raw = completion.choices[0]?.message?.content ?? "{}";
    aiResult = JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch (err: unknown) {
    req.log.error({ err }, "OpenAI vision call failed or timed out");
    const isTimeout =
      (err instanceof Error && (err.name === "AbortError" || err.message?.includes("abort")));
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
