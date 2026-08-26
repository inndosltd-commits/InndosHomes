import { db } from "@workspace/db";
import { settings } from "@workspace/db";
import { eq } from "drizzle-orm";

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

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PesaPal order submission failed: ${res.status} ${body}`);
  }

  const data = (await res.json()) as {
    order_tracking_id: string;
    merchant_reference: string;
    redirect_url: string;
  };

  return {
    redirectUrl: data.redirect_url,
    orderTrackingId: data.order_tracking_id,
  };
}

export async function getTransactionStatus(orderTrackingId: string): Promise<{
  paymentMethod: string;
  amount: number;
  createdDate: string;
  confirmedDate: string;
  status: string;
  description: string;
  paymentStatusDescription: string; // Completed | Failed | Invalid | Reversed
  merchantReference: string;
  currency: string;
}> {
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

  const data = await res.json() as Record<string, unknown>;
  return {
    paymentMethod: String(data.payment_method ?? data.paymentMethod ?? ""),
    amount: Number(data.amount),
    createdDate: String(data.created_date ?? data.createdDate ?? ""),
    confirmedDate: String(data.confirmed_date ?? data.confirmedDate ?? ""),
    status: String(data.status_code ?? data.status ?? ""),
    description: String(data.description ?? ""),
    paymentStatusDescription: String(data.payment_status_description ?? data.paymentStatusDescription ?? ""),
    merchantReference: String(data.merchant_reference ?? data.merchantReference ?? ""),
    currency: String(data.currency ?? ""),
  };
}

export function invalidateTokenCache() {
  cachedToken = null;
}
