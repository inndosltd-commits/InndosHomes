import { db } from "@workspace/db";
import { settings } from "@workspace/db";
import { inArray } from "drizzle-orm";
import { logger } from "./logger";

const SMS_KEYS = ["sms_api_key", "sms_sender_id", "sms_provider", "sms_username", "sms_password"] as const;

async function getSmsSettings() {
  const rows = await db
    .select({ key: settings.key, value: settings.value })
    .from(settings)
    .where(inArray(settings.key, [...SMS_KEYS]));

  const map: Record<string, string> = {};
  for (const row of rows) map[row.key] = row.value;

  return {
    apiKey:   map["sms_api_key"]   ?? "",
    senderId: map["sms_sender_id"] ?? "INNDOS",
    provider: map["sms_provider"]  ?? "africastalking",
    username: map["sms_username"]  ?? "",
    password: map["sms_password"]  ?? "",
  };
}

export function normalizePhone(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (d.startsWith("254") && d.length === 12) return `+${d}`;
  if (d.startsWith("0")   && d.length === 10) return `+254${d.slice(1)}`;
  if (d.startsWith("7")   && d.length === 9)  return `+254${d}`;
  if (d.startsWith("1")   && d.length === 9)  return `+254${d}`;
  return null;
}

export async function sendSms(to: string, message: string): Promise<void> {
  const { apiKey, senderId, provider, username, password } = await getSmsSettings();

  if (provider === "airtouch") {
    if (!username || !password) {
      throw new Error("Airtouch SMS credentials (username/password) are not configured.");
    }

    // Airtouch expects the number without the leading +, e.g. 254712345678
    const msisdn = to.replace(/^\+/, "");

    const url = new URL("https://client.airtouch.co.ke:9012/sms/api/");
    url.searchParams.set("issn",     senderId);
    url.searchParams.set("msisdn",   msisdn);
    url.searchParams.set("text",     message);
    url.searchParams.set("username", username);
    url.searchParams.set("password", password);

    const res = await fetch(url.toString());
    const text = await res.text().catch(() => "");

    if (!res.ok) {
      throw new Error(`Airtouch SMS error ${res.status}: ${text}`);
    }

    // Airtouch returns a plain-text response — treat anything non-empty as success
    // unless it contains a known failure keyword
    const lower = text.toLowerCase();
    if (lower.includes("error") || lower.includes("invalid") || lower.includes("fail")) {
      throw new Error(`Airtouch SMS rejected: ${text}`);
    }

    logger.info({ to, provider: "airtouch", response: text }, "SMS sent");
    return;
  }

  if (provider === "africastalking") {
    if (!apiKey) {
      throw new Error("SMS API key is not configured. Please set it in admin settings.");
    }

    const body = new URLSearchParams({ username: username || "inndos", to, message, from: senderId });

    const res = await fetch("https://api.africastalking.com/version1/messaging", {
      method: "POST",
      headers: {
        "apiKey": apiKey,
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const text = await res.text().catch(() => "");
    if (!res.ok) {
      throw new Error(`SMS API error ${res.status}: ${text}`);
    }

    let parsed: { SMSMessageData?: { Recipients?: Array<{ status: string; number: string }> } } = {};
    try { parsed = JSON.parse(text); } catch { /* ignore */ }

    const recipients = parsed.SMSMessageData?.Recipients ?? [];
    const failed = recipients.filter(r => r.status !== "Success");
    if (failed.length > 0 && recipients.length > 0) {
      throw new Error(`SMS delivery failed for: ${failed.map(r => r.number).join(", ")}`);
    }

    logger.info({ to, provider }, "SMS sent");
    return;
  }

  throw new Error(`Unsupported SMS provider: ${provider}`);
}
