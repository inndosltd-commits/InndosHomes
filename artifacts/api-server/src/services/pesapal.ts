import { db } from "@workspace/db";
import { settings } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import {
  normalizePesapalTransactionStatus,
  type PesapalTransactionStatus,
} from "./pesapal-status";

export { normalizePesapalTransactionStatus };
export type { PesapalTransactionStatus };

const SANDBOX_URL = "https://cybqa.pesapal.com/pesapalv3";
const LIVE_URL = "https://pay.pesapal.com/v3";

export type PesapalConfig = {
  consumerKey: string;
  consumerSecret: string;
  mode: "sandbox" | "live";
  ipnId: string;
};

let cachedToken: { token: string; expiresAt: number; configSignature: string } | null = null;
const IPN_CACHE_SETTING = "pesapal_ipn_ids";

function configSignature(config: PesapalConfig): string {
  return createHash("sha256")
    .update(`${config.mode}\0${config.consumerKey}\0${config.consumerSecret}`)
    .digest("hex");
}

type RegisteredIpn = {
  url?: string;
  ipn_id?: string;
  ipn_notification_type_description?: string;
  ipn_status?: number;
};

function normalizeIpnUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = "";
    url.hostname = url.hostname.toLowerCase();
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    return url.toString().replace(/\/$/, "");
  } catch {
    return value.trim().replace(/\/+$/, "");
  }
}

async function saveIpnId(ipnId: string): Promise<void> {
  await db
    .insert(settings)
    .values({ key: "pesapal_ipn_id", value: ipnId })
    .onConflictDoUpdate({ target: settings.key, set: { value: ipnId, updatedAt: new Date() } });
}

async function readIpnCache(): Promise<Record<string, string>> {
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, IPN_CACHE_SETTING))
    .limit(1);
  if (!row?.value) return {};
  try {
    const parsed = JSON.parse(row.value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([key, value]) => typeof key === "string" && typeof value === "string" && value.length > 0,
      ),
    );
  } catch {
    return {};
  }
}

export async function rememberIpnForConfig(config: PesapalConfig, ipnId: string): Promise<void> {
  const cache = await readIpnCache();
  cache[configSignature(config)] = ipnId;
  await db
    .insert(settings)
    .values({ key: IPN_CACHE_SETTING, value: JSON.stringify(cache) })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: JSON.stringify(cache), updatedAt: new Date() },
    });
}

async function getRememberedIpnId(config: PesapalConfig): Promise<string> {
  const cache = await readIpnCache();
  return cache[configSignature(config)] ?? "";
}

async function saveActiveIpnId(ipnId: string, config: PesapalConfig): Promise<void> {
  await Promise.all([
    saveIpnId(ipnId),
    rememberIpnForConfig(config, ipnId),
  ]);
}

async function findRegisteredIpn(
  base: string,
  token: string,
  callbackUrl: string,
): Promise<string | null> {
  const res = await fetch(`${base}/api/URLSetup/GetIpnList`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) return null;

  const data = await res.json() as unknown;
  const entries: unknown[] = Array.isArray(data)
    ? data
    : data && typeof data === "object"
      ? (() => {
          const payload = data as Record<string, unknown>;
          const wrapped = [payload.data, payload.ipns, payload.results].find(Array.isArray);
          return Array.isArray(wrapped) ? wrapped : [data];
        })()
      : [];

  const expectedUrl = normalizeIpnUrl(callbackUrl);
  const match = (entries as RegisteredIpn[]).find((entry) =>
    entry.ipn_id &&
    entry.url &&
    normalizeIpnUrl(entry.url) === expectedUrl &&
    entry.ipn_status !== 0 &&
    (!entry.ipn_notification_type_description ||
      entry.ipn_notification_type_description.toUpperCase() === "GET")
  );
  return match?.ipn_id ?? null;
}

function summarizeGatewayBody(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) return "empty response";
  if (/^<!doctype html|^<html[\s>]/i.test(trimmed)) return "gateway returned an HTML server-error page";
  return trimmed.replace(/\s+/g, " ").slice(0, 500);
}

export async function getPesapalConfig(): Promise<PesapalConfig> {
  const rows = await db.select().from(settings);

  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;

  return {
    consumerKey: map["pesapal_consumer_key"] ?? process.env.PESAPAL_CONSUMER_KEY ?? "",
    consumerSecret: map["pesapal_consumer_secret"] ?? process.env.PESAPAL_CONSUMER_SECRET ?? "",
    mode: (map["pesapal_mode"] ?? process.env.PESAPAL_MODE ?? "sandbox") as "sandbox" | "live",
    ipnId: map["pesapal_ipn_id"] ?? "",
  };
}

export function getBaseUrl(mode: "sandbox" | "live") {
  return mode === "live" ? LIVE_URL : SANDBOX_URL;
}

export async function getAuthToken(configOverride?: PesapalConfig): Promise<string> {
  const config = configOverride ?? await getPesapalConfig();
  if (!config.consumerKey || !config.consumerSecret) {
    throw new Error("PesaPal is not configured. An administrator must save the PesaPal consumer key and secret before checkout.");
  }
  const signature = configSignature(config);
  if (
    cachedToken &&
    cachedToken.configSignature === signature &&
    Date.now() < cachedToken.expiresAt - 60_000
  ) {
    return cachedToken.token;
  }
  const base = getBaseUrl(config.mode);

  const res = await fetch(`${base}/api/Auth/RequestToken`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      consumer_key: config.consumerKey,
      consumer_secret: config.consumerSecret,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PesaPal auth failed: ${res.status} ${body}`);
  }

  const data = (await res.json()) as { token: string; expiryDate: string };
  const expiresAt = new Date(data.expiryDate).getTime();
  cachedToken = { token: data.token, expiresAt, configSignature: signature };
  return data.token;
}

export async function registerIPN(callbackUrl: string, configOverride?: PesapalConfig): Promise<string> {
  const config = configOverride ?? await getPesapalConfig();
  const base = getBaseUrl(config.mode);
  const token = await getAuthToken(config);

  const rememberedIpnId = await getRememberedIpnId(config);
  if (rememberedIpnId) {
    await saveIpnId(rememberedIpnId);
    return rememberedIpnId;
  }

  const existingIpnId = await findRegisteredIpn(base, token, callbackUrl);
  if (existingIpnId) {
    await saveActiveIpnId(existingIpnId, config);
    return existingIpnId;
  }

  const res = await fetch(`${base}/api/URLSetup/RegisterIPN`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      url: callbackUrl,
      ipn_notification_type: "GET",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 409) {
      const registeredIpnId = await findRegisteredIpn(base, token, callbackUrl);
      if (registeredIpnId) {
        await saveActiveIpnId(registeredIpnId, config);
        return registeredIpnId;
      }
    }
    throw new Error(`PesaPal IPN registration failed: ${res.status} ${summarizeGatewayBody(body)}`);
  }

  const data = (await res.json()) as { ipn_id: string };

  await saveActiveIpnId(data.ipn_id, config);

  return data.ipn_id;
}

export interface OrderRequest {
  merchantReference: string;
  amount: number;
  description: string;
  callbackUrl: string;
  userEmail: string;
  userFirstName: string;
  userLastName: string;
  currency?: string;
}

type PesapalOrderResponse = {
  order_tracking_id?: string;
  orderTrackingId?: string;
  merchant_reference?: string;
  merchantReference?: string;
  redirect_url?: string;
  redirectUrl?: string;
  status?: string | number;
  error?: {
    error_type?: string;
    code?: string;
    message?: string;
  } | string | null;
  message?: string;
};

export function describeOrderError(data: PesapalOrderResponse, mode: "sandbox" | "live"): string {
  const details = typeof data.error === "string"
    ? data.error
    : [data.error?.message, data.error?.error_type, data.error?.code]
        .filter((value): value is string => Boolean(value))
        .join(" · ");
  const normalized = `${details} ${data.message ?? ""}`.toLowerCase();
  if (mode === "sandbox" && (normalized.includes("test_transactions_exceeded") || normalized.includes("maximum_amount_limit_exceeded"))) {
    return "PesaPal's sandbox test limit has been reached. No charge was made. An administrator must use PesaPal live credentials in Admin > Payment Settings, or request a sandbox limit reset from PesaPal.";
  }
  if (mode === "live" && normalized.includes("test_transactions_exceeded")) {
    return "PesaPal returned TEST_TRANSACTIONS_EXCEEDED for these live credentials. INNDOS is using PesaPal's production endpoint, but PesaPal has classified this merchant account as test-limited. No charge was made. Ask PesaPal to activate or reset the live merchant account, or issue unrestricted production API credentials.";
  }
  if (mode === "live" && normalized.includes("maximum_amount_limit_exceeded")) {
    return "PesaPal rejected this live order because the merchant account's allowed transaction amount or account limit was exceeded. No charge was made. Check the live account limits with PesaPal.";
  }
  if (mode === "live" && normalized.includes("amount_exceeds_default_limit")) {
    return "PesaPal rejected this live order because it exceeds the merchant account's default transaction limit. No charge was made. Ask PesaPal to raise the live account limit.";
  }
  return details || data.message || (data.status ? `status ${data.status}` : "missing checkout details");
}

export async function submitOrder(req: OrderRequest): Promise<{ redirectUrl: string; orderTrackingId: string }> {
  const config = await getPesapalConfig();
  const base = getBaseUrl(config.mode);
  const token = await getAuthToken(config);

  let ipnId = config.ipnId;
  if (!ipnId) {
    const ipnUrl = req.callbackUrl.replace(/\/subscriptions.*/, "/subscriptions/ipn");
    ipnId = await registerIPN(ipnUrl, config);
  }

  const res = await fetch(`${base}/api/Transactions/SubmitOrderRequest`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      id: req.merchantReference,
      currency: req.currency ?? "KES",
      amount: req.amount,
      description: req.description,
      callback_url: req.callbackUrl,
      notification_id: ipnId,
      billing_address: {
        email_address: req.userEmail,
        first_name: req.userFirstName,
        last_name: req.userLastName,
        phone_number: "",
        country_code: "KE",
      },
    }),
  });

  const body = await res.text();
  let data: PesapalOrderResponse = {};
  try {
    data = body ? JSON.parse(body) as PesapalOrderResponse : {};
  } catch {
    if (!res.ok) {
      throw new Error(`PesaPal order submission failed: ${res.status} ${body.slice(0, 300)}`);
    }
    throw new Error("PesaPal order submission failed: the gateway returned an invalid response.");
  }

  if (!res.ok) {
    throw new Error(`PesaPal order submission failed: ${res.status} ${describeOrderError(data, config.mode)}`);
  }

  const redirectUrl = data.redirect_url ?? data.redirectUrl ?? "";
  const orderTrackingId = data.order_tracking_id ?? data.orderTrackingId ?? "";
  if (!redirectUrl || !orderTrackingId) {
    throw new Error(`PesaPal order rejected: ${describeOrderError(data, config.mode)}`);
  }

  return {
    redirectUrl,
    orderTrackingId,
  };
}

export async function getTransactionStatus(orderTrackingId: string): Promise<PesapalTransactionStatus> {
  const config = await getPesapalConfig();
  const base = getBaseUrl(config.mode);
  const token = await getAuthToken(config);

  const res = await fetch(
    `${base}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PesaPal status check failed: ${res.status} ${body}`);
  }

  return normalizePesapalTransactionStatus(await res.json() as Record<string, unknown>);
}

export function invalidateTokenCache() {
  cachedToken = null;
}
