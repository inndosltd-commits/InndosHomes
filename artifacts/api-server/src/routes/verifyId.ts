import { Router } from "express";
import sharp from "sharp";
import { requireAuth } from "../lib/requireAuth";
import { ObjectStorageService } from "../lib/objectStorage";
import { db } from "@workspace/db";
import { users } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();
const objectStorageService = new ObjectStorageService();

function namesOverlap(registeredName: string, idName: string): boolean {
  if (!idName.trim()) return true; // model confirmed ID but didn't return name
  const clean = (s: string) =>
    s.toLowerCase().replace(/[^a-z\s]/g, "").trim().split(/\s+/).filter(w => w.length > 1);
  const regParts = clean(registeredName);
  const idParts = clean(idName);
  if (regParts.length === 0 || idParts.length === 0) return false;
  return regParts.filter(w => idParts.includes(w)).length >= Math.min(2, Math.min(regParts.length, idParts.length));
}

router.post("/auth/verify-id", async (req, res) => {
  // ── HARD DEADLINE — registered synchronously BEFORE any await ─────────────
  const DEADLINE_MS = 30_000;
  const deadlineTimer = setTimeout(() => {
    req.log.warn("verify-id: deadline fired");
    if (!res.headersSent) {
      res.status(500).json({ ok: false, message: "Verification timed out. Please try again." });
    }
  }, DEADLINE_MS);
  // ─────────────────────────────────────────────────────────────────────────

  try {
    // requireAuth is a helper, NOT middleware — call it inside the handler
    const userId = requireAuth(req, res);
    if (!userId) return;

    const { objectPath } = req.body as { objectPath?: string };
    if (!objectPath || typeof objectPath !== "string") {
      res.status(400).json({ ok: false, message: "objectPath is required" });
      return;
    }

    req.log.info("verify-id: step=db-lookup");
    const [user] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId));
    if (!user) {
      res.status(401).json({ ok: false, message: "User not found" });
      return;
    }

    req.log.info("verify-id: step=storage-download");
    const file = await objectStorageService.getObjectEntityFile(objectPath);
    const response = await objectStorageService.downloadObject(file);
    const arrayBuffer = await response.arrayBuffer();

    req.log.info({ originalBytes: arrayBuffer.byteLength }, "verify-id: step=sharp-resize");
    const resized = await sharp(Buffer.from(arrayBuffer))
      .resize({ width: 512, height: 512, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 75 })
      .toBuffer();
    const imageBase64 = resized.toString("base64");

    const baseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
    const apiKey  = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

    // Retry up to 2 times — model occasionally returns empty content
    type AiResult = { isKenyanId?: boolean; extractedName?: string; reason?: string };
    let result: AiResult = {};

    for (let attempt = 1; attempt <= 2; attempt++) {
      req.log.info({ resizedBytes: resized.length, attempt }, "verify-id: step=ai-call");

      const aiResponse = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "gpt-5-mini",
          max_completion_tokens: 2048,
          messages: [
            {
              role: "system",
              content:
                'You are an automated ID verification system. Reply ONLY with valid JSON: {"isKenyanId":bool,"extractedName":"string","reason":"string"}. ' +
                'isKenyanId is true if the image shows a Kenyan National ID card (front or back). ' +
                'extractedName is the name from the FULL NAMES field. Accept any photo quality.',
            },
            {
              role: "user",
              content: [
                { type: "text", text: "Is this a valid Kenyan National ID? Extract the name if visible." },
                { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
              ],
            },
          ],
        }),
      });

      req.log.info({ status: aiResponse.status, attempt }, "verify-id: step=ai-response");

      if (!aiResponse.ok) {
        throw new Error(`AI service returned ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json() as { choices: Array<{ message: { content: string } }> };
      const raw = (aiData.choices[0]?.message?.content ?? "").replace(/```json|```/g, "").trim();
      req.log.info({ raw: raw.substring(0, 200), attempt }, "verify-id: step=ai-raw");

      if (!raw) {
        req.log.warn({ attempt }, "verify-id: empty AI response, retrying");
        continue;
      }

      try {
        result = JSON.parse(raw) as AiResult;
        break;
      } catch {
        req.log.warn({ raw, attempt }, "verify-id: JSON parse failed, retrying");
      }
    }

    req.log.info({ isKenyanId: result.isKenyanId, extractedName: result.extractedName }, "verify-id: step=result");

    if (!result.isKenyanId) {
      if (!res.headersSent) {
        res.json({
          ok: false, isKenyanId: false, namesMatch: false, extractedName: "",
          message: "Image does not appear to be a Kenyan National ID. Please upload only your Kenyan National ID card.",
        });
      }
      return;
    }

    const nameMatches = namesOverlap(user.name, result.extractedName ?? "");
    if (!nameMatches) {
      if (!res.headersSent) {
        res.json({
          ok: false, isKenyanId: true, namesMatch: false, extractedName: result.extractedName ?? "",
          message: `Name on ID ("${result.extractedName}") does not match your account name ("${user.name}"). Please upload an ID that matches your registered name.`,
        });
      }
      return;
    }

    if (!res.headersSent) {
      res.json({
        ok: true, isKenyanId: true, namesMatch: true, extractedName: result.extractedName ?? "",
        message: `Verified. Name: ${result.extractedName}`,
      });
    }
  } catch (err: unknown) {
    req.log.error({ err }, "verify-id: error");
    if (!res.headersSent) {
      res.status(500).json({ ok: false, message: "Verification failed. Please try again." });
    }
  } finally {
    clearTimeout(deadlineTimer);
  }
});

export default router;
