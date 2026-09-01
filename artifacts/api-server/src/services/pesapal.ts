import { db } from "@workspace/db";
import { settings } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  normalizePesapalTransactionStatus,
  type PesapalTransactionStatus,
} from "./pesapal-status";

export { normalizePesapalTransactionStatus };
export type { PesapalTransactionStatus };

const SANDBOX_URL = "https://cybqa.pesapal.com/pesapalv3";
const LIVE_URL = "https://pay.pesapal.com/v3";

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getPesapalConfig() {
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

export async function getAuthToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const config = await getPesapalConfig();
  if (!config.consumerKey || !config.consumerSecret) {
    throw new Error("PesaPal is not configured. An administrator must save the PesaPal consumer key and secret before checkout.");
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
  cachedToken = { token: data.token, expiresAt };
  return data.token;
}

export async function registerIPN(callbackUrl: string): Promise<string> {
  const config = await getPesapalConfig();
  const base = getBaseUrl(config.mode);
  const token = await getAuthToken();

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
    throw new Error(`PesaPal IPN registration failed: ${res.status} ${body}`);
  }

  const data = (await res.json()) as { ipn_id: string };

  // Save ipn_id to settings
  await db
    .insert(settings)
    .values({ key: "pesapal_ipn_id", value: data.ipn_id })
    .onConflictDoUpdate({ target: settings.key, set: { value: data.ipn_id, updatedAt: new Date() } });

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

function describeOrderError(data: PesapalOrderResponse): string {
  const details = typeof data.error === "string"
    ? data.error
    : [data.error?.message, data.error?.error_type, data.error?.code]
        .filter((value): value is string => Boolean(value))
        .join(" · ");
  return details || data.message || (data.status ? `status ${data.status}` : "missing checkout details");
}

export async function submitOrder(req: OrderRequest): Promise<{ redirectUrl: string; orderTrackingId: string }> {
  const config = await getPesapalConfig();
  const base = getBaseUrl(config.mode);
  const token = await getAuthToken();

  let ipnId = config.ipnId;
  if (!ipnId) {
    const ipnUrl = req.callbackUrl.replace(/\/subscriptions.*/, "/subscriptions/ipn");
    ipnId = await registerIPN(ipnUrl);
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
    throw new Error(`PesaPal order submission failed: ${res.status} ${describeOrderError(data)}`);
  }

  const redirectUrl = data.redirect_url ?? data.redirectUrl ?? "";
  const orderTrackingId = data.order_tracking_id ?? data.orderTrackingId ?? "";
  if (!redirectUrl || !orderTrackingId) {
    throw new Error(`PesaPal order rejected: ${describeOrderError(data)}`);
  }

  return {
    redirectUrl,
    orderTrackingId,
  };
}

export async function getTransactionStatus(orderTrackingId: string): Promise<PesapalTransactionStatus> {
  const config = await getPesapalConfig();
  const base = getBaseUrl(config.mode);
  const token = await getAuthToken();

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
