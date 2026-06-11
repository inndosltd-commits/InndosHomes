import sharp from "sharp";
import fs from "fs";
import path from "path";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? "dummy",
});

const AI_TIMEOUT_MS = 20_000;

function namesOverlap(registeredName: string, idName: string): boolean {
  const clean = (s: string) =>
    s.toLowerCase().replace(/[^a-z\s]/g, "").trim().split(/\s+/).filter(w => w.length > 1);
  const regParts = clean(registeredName);
  const idParts = clean(idName);
  const matches = regParts.filter(w => idParts.includes(w));
  return matches.length >= Math.min(2, Math.min(regParts.length, idParts.length));
}

async function testImage(label: string, filePath: string, accountName: string, model = "gpt-5-nano", maxTokens = 1024) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`TEST: ${label}`);
  console.log(`File: ${filePath}`);
  console.log(`Account name: "${accountName}"`);
  console.log("=".repeat(60));

  const raw = fs.readFileSync(filePath);
  const t0 = Date.now();

  // Resize exactly as the route does
  const resized = await sharp(raw)
    .resize({ width: 512, height: 512, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 75 })
    .toBuffer();

  console.log(`Image: ${raw.length} bytes → ${resized.length} bytes after resize`);

  const imageBase64 = resized.toString("base64");

  const aiCall = openai.chat.completions.create({
    model,
    max_completion_tokens: maxTokens,
    messages: [
      {
        role: "system",
        content:
          'You are an ID verification system. Reply ONLY with valid JSON (no markdown): {"isKenyanId":bool,"extractedName":"string","reason":"string"}. ' +
          'isKenyanId is true only if the image shows a Kenyan National ID card (has "REPUBLIC OF KENYA" or "JAMHURI YA KENYA" text, ID number field, date of birth field, and holder photo). ' +
          "extractedName is the full name printed on the card, or empty string. reason is one sentence.",
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Is this a valid Kenyan National ID? Extract the name." },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
        ],
      },
    ],
  });

  const hardTimeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("AI_TIMEOUT")), AI_TIMEOUT_MS)
  );

  try {
    const completion = await Promise.race([aiCall, hardTimeout]);
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    const choice = completion.choices[0];
    console.log(`finish_reason: ${choice?.finish_reason}`);
    console.log(`refusal: ${choice?.message?.refusal ?? "none"}`);
    console.log(`content raw: ${JSON.stringify(choice?.message?.content)}`);
    const rawJson = choice?.message?.content ?? "{}";

    const result = JSON.parse(rawJson.replace(/```json|```/g, "").trim());
    console.log(`isKenyanId: ${result.isKenyanId}`);
    console.log(`extractedName: "${result.extractedName}"`);
    console.log(`reason: ${result.reason}`);

    if (result.isKenyanId) {
      const match = namesOverlap(accountName, result.extractedName);
      console.log(`namesOverlap("${accountName}", "${result.extractedName}"): ${match}`);
      console.log(`RESULT: ${match ? "✅ VERIFIED" : "❌ NAME MISMATCH"}`);
    } else {
      console.log("RESULT: ❌ NOT A KENYAN ID");
    }
  } catch (err: unknown) {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`ERROR after ${elapsed}s: ${msg}`);
    console.log("RESULT: ❌ TIMED OUT OR FAILED");
  }
}

async function main() {
  const accountName = "michael kivu makuthu paul";
  const root = path.resolve(import.meta.dirname, "../..");
  const front = path.join(root, "attached_assets/WhatsApp_Image_2025-01-06_at_16.48.55(2)_1781178746237.jpeg");

  const back = path.join(root, "attached_assets/hh_1781178746236.jpg");

  // Run twice to confirm consistency
  await testImage("[1] FRONT — correct name (should PASS)", front, accountName, "gpt-5-mini", 2048);
  await testImage("[2] BACK  — correct name (should PASS)", back, accountName, "gpt-5-mini", 2048);
  await testImage("[3] FRONT — wrong name (should FAIL namecheck)", front, "john doe", "gpt-5-mini", 2048);
  await testImage("[4] FRONT — correct name again (consistency check)", front, accountName, "gpt-5-mini", 2048);
}

main().catch(console.error);
