import { Router } from "express";
import { db } from "@workspace/db";
import { subscriptions, users, properties, payments, settings, subscriptionPlans } from "@workspace/db";
import { eq, and, desc, count } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";
import { sendSubscriptionRenewalConfirmationEmail } from "../lib/email";
import {
  submitOrder,
  getTransactionStatus,
  getPesapalConfig,
  registerIPN,
} from "../services/pesapal";

const router = Router();

// Fallback hardcoded values (used if DB is unavailable)
const DEFAULT_PLAN_LIMITS: Record<string, number> = { free: 3, basic: 7, pro: 15, enterprise: 2147483647 };
const DEFAULT_PLAN_PRICES: Record<string, number> = { free: 0, basic: 399, pro: 599, enterprise: 0 };
export const VIDEO_LIMITS: Record<string, number> = { free: 0, basic: 0, pro: 1, enterprise: 5 };
export function getVideoLimit(plan: string): number {
  return VIDEO_LIMITS[plan] ?? 0;
}

export const IMAGE_LIMITS: Record<string, number> = { free: 5, basic: 10, pro: 20, enterprise: 2147483647 };
export function getImageLimit(plan: string): number {
  return IMAGE_LIMITS[plan] ?? 5;
}

// Load plan config from DB (cached per request via module-level cache with short TTL)
export type PlanEntitlements = {
  price: number; limit: number; imageLimit: number; videoLimit: number;
  featuredLimit: number; discoveryEnabled: boolean; searchBoost: number; phoneSupport: boolean;
};
let planCache: { data: Record<string, PlanEntitlements>; ts: number } | null = null;

async function getPlansConfig(): Promise<Record<string, PlanEntitlements>> {
  if (planCache && Date.now() - planCache.ts < 30_000) return planCache.data;
  try {
    const rows = await db.select().from(subscriptionPlans);
    const data: Record<string, PlanEntitlements> = {};
    for (const r of rows) {
      data[r.name] = {
        price: r.pricePerMonth,
        limit: r.listingLimit,
        imageLimit: r.imageLimit,
        videoLimit: r.videoLimit,
        featuredLimit: r.featuredLimit,
        discoveryEnabled: r.discoveryEnabled,
        searchBoost: r.searchBoost,
        phoneSupport: r.phoneSupport,
      };
    }
    planCache = { data, ts: Date.now() };
    return data;
  } catch {
    return Object.fromEntries(
      Object.keys(DEFAULT_PLAN_PRICES).map(k => [k, {
        price: DEFAULT_PLAN_PRICES[k] ?? 0, limit: DEFAULT_PLAN_LIMITS[k] ?? 3,
        imageLimit: IMAGE_LIMITS[k] ?? 5, videoLimit: VIDEO_LIMITS[k] ?? 0,
        featuredLimit: ({ free: 0, basic: 1, pro: 3, enterprise: 0 } as Record<string, number>)[k] ?? 0,
        discoveryEnabled: k !== "free", searchBoost: k === "pro" ? 2 : k === "basic" ? 1 : k === "enterprise" ? 3 : 0,
        phoneSupport: k === "enterprise",
      }])
    );
  }
}

export function invalidatePlanCache() {
  planCache = null;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function getActiveSubscription(userId: string) {
  const today = toDateStr(new Date());
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, "active")
      )
    )
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);

  if (sub && sub.endDate >= today) return sub;
  return null;
}

export function getPlanLimit(plan: string): number {
  return DEFAULT_PLAN_LIMITS[plan] ?? 3;
}

export async function getPlanEntitlements(plan: string): Promise<PlanEntitlements> {
  const plans = await getPlansConfig();
  return plans[plan] ?? plans.free ?? {
    price: 0, limit: 3, imageLimit: 5, videoLimit: 0, featuredLimit: 0,
    discoveryEnabled: false, searchBoost: 0, phoneSupport: false,
  };
}

async function calcAmount(plan: string, cycle: string, months: number): Promise<number> {
  const plans = await getPlansConfig();
  const pricePerMonth = plans[plan]?.price ?? DEFAULT_PLAN_PRICES[plan] ?? 0;
  const yearlyDiscount = cycle === "yearly" ? Math.round(pricePerMonth * 0.1 * 12) : 0; // 10% yearly discount
  return Math.max(0, pricePerMonth * months - yearlyDiscount);
}

// GET /api/subscriptions/plans  — public endpoint returning plan details
router.get("/plans", async (_req, res) => {
  try {
    const rows = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true));
    res.json(rows);
  } catch {
    res.json([]);
  }
});

// GET /api/subscriptions/me
router.get("/me", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const sub = await getActiveSubscription(userId);
  const [{ listingCount }] = await db
    .select({ listingCount: count() })
    .from(properties)
    .where(eq(properties.ownerId, userId));

  const plans = await getPlansConfig();

  if (!sub) {
    res.json({
      plan: "free",
      status: "active",
      billingCycle: "monthly",
      billingMonths: 0,
      amountPaid: 0,
      startDate: toDateStr(new Date()),
      endDate: "9999-12-31",
      listingCount: Number(listingCount),
      listingLimit: plans["free"]?.limit ?? 3,
      ...(await getPlanEntitlements("free")),
    });
    return;
  }

  res.json({
    ...sub,
    listingCount: Number(listingCount),
    listingLimit: plans[sub.plan]?.limit ?? getPlanLimit(sub.plan),
    ...(await getPlanEntitlements(sub.plan)),
  });
});

// POST /api/subscriptions/upgrade  (free/manual — no payment)
router.post("/upgrade", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { plan, billingCycle, months } = req.body as {
    plan?: string;
    billingCycle?: string;
    months?: number;
  };

  if (!plan || !["free", "basic", "pro", "enterprise"].includes(plan)) {
    res.status(400).json({ error: "plan must be free, basic, pro, or enterprise" });
    return;
  }
  if (plan === "enterprise") {
    res.status(400).json({ error: "Enterprise pricing is custom. Contact an administrator to request access.", code: "CUSTOM_PRICING" });
    return;
  }

  if (plan === "free") {
    await db
      .update(subscriptions)
      .set({ status: "cancelled" })
      .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")));

    res.json({ plan: "free", status: "active", message: "Downgraded to Free Plan" });
    return;
  }

  const cycle = billingCycle && ["monthly", "yearly", "custom"].includes(billingCycle)
    ? (billingCycle as "monthly" | "yearly" | "custom")
    : "monthly";

  let billingMonths = 1;
  if (cycle === "yearly") billingMonths = 12;
  else if (cycle === "custom" && months && months >= 1) billingMonths = Math.floor(months);

  const amountPaid = await calcAmount(plan, cycle, billingMonths);
  const startDate = toDateStr(new Date());
  const endDate = toDateStr(addMonths(new Date(), billingMonths));

  await db
    .update(subscriptions)
    .set({ status: "cancelled" })
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")));

  const [newSub] = await db
    .insert(subscriptions)
    .values({
      userId,
      plan: plan as "basic" | "pro" | "enterprise",
      status: "active",
      billingCycle: cycle,
      billingMonths,
      amountPaid,
      startDate,
      endDate,
    })
    .returning();

  // Send renewal confirmation email (best-effort)
  const domains = process.env.REPLIT_DOMAINS?.split(",")[0];
  const baseUrl = domains ? `https://${domains}` : "https://inndos.com";
  const [usr] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, userId)).catch(() => [null]);
  if (usr?.email) {
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const expiryParts = newSub.endDate.split("-");
    const expiryFmt = `${parseInt(expiryParts[2], 10)} ${months[parseInt(expiryParts[1], 10) - 1]} ${expiryParts[0]}`;
    sendSubscriptionRenewalConfirmationEmail({
      toEmail:      usr.email,
      ownerName:    usr.name ?? "Valued Customer",
      planName:     plan.charAt(0).toUpperCase() + plan.slice(1),
      amount:       newSub.amountPaid ?? 0,
      newExpiryDate: expiryFmt,
      billingCycle: newSub.billingCycle ?? "monthly",
      dashboardUrl: `${baseUrl}/#/dashboard?tab=subscription`,
    }).catch(() => {});
  }

  res.status(201).json({
    ...newSub,
    ...(await getPlanEntitlements(plan)),
    message: `Upgraded to ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan`,
  });
});

// POST /api/subscriptions/checkout  — initiate PesaPal payment
router.post("/checkout", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { plan, billingCycle, months } = req.body as {
    plan?: string;
    billingCycle?: string;
    months?: number;
  };

  if (!plan || !["basic", "pro"].includes(plan)) {
    res.status(400).json({ error: "Paid checkout is available for Basic or Pro. Enterprise pricing is custom.", code: "CUSTOM_PRICING" });
    return;
  }

  const [user] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const cycle = billingCycle && ["monthly", "yearly", "custom"].includes(billingCycle)
    ? (billingCycle as "monthly" | "yearly" | "custom")
    : "monthly";

  let billingMonths = 1;
  if (cycle === "yearly") billingMonths = 12;
  else if (cycle === "custom" && months && months >= 1) billingMonths = Math.floor(months);

  const amount = await calcAmount(plan, cycle, billingMonths);

  const merchantReference = `INNDOS-${userId.slice(0, 8).toUpperCase()}-${Date.now()}`;

  // Create pending payment record
  const [payment] = await db
    .insert(payments)
    .values({
      userId,
      pesapalOrderId: merchantReference,
      merchantReference,
      amount,
      plan: plan as "basic" | "pro" | "enterprise",
      billingMonths,
      status: "pending",
      description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan - ${billingMonths} month${billingMonths > 1 ? "s" : ""}`,
    })
    .returning();

  const nameParts = user.name.trim().split(" ");
  const firstName = nameParts[0] ?? "User";
  const lastName = nameParts.slice(1).join(" ") || "Customer";

  // Build callback/IPN URLs from the request host
  const proto = req.headers["x-forwarded-proto"] ?? "https";
  const host = req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost";
  const baseUrl = `${proto}://${host}`;
  const callbackUrl = `${baseUrl}/api/subscriptions/callback?paymentId=${payment.id}&plan=${plan}&months=${billingMonths}&cycle=${cycle}`;
  const ipnUrl = `${baseUrl}/api/subscriptions/ipn`;

  // Make sure IPN is registered
  const config = await getPesapalConfig();
  if (!config.ipnId) {
    try {
      await registerIPN(ipnUrl);
    } catch (err) {
      req.log?.warn({ err }, "IPN registration failed; proceeding anyway");
    }
  }

  try {
    const { redirectUrl, orderTrackingId } = await submitOrder({
      merchantReference,
      amount,
      description: payment.description ?? `${plan} Plan`,
      callbackUrl,
      userEmail: user.email,
      userFirstName: firstName,
      userLastName: lastName,
      currency: "KES",
    });

    // Save tracking ID
    await db
      .update(payments)
      .set({ pesapalTrackingId: orderTrackingId, pesapalOrderId: merchantReference })
      .where(eq(payments.id, payment.id));

    res.json({ redirectUrl, paymentId: payment.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "PesaPal error";
    req.log?.error({ err }, "PesaPal checkout failed");
    res.status(502).json({ error: msg });
  }
});

// GET /api/subscriptions/callback  — PesaPal redirect after payment
router.get("/callback", async (req, res) => {
  const { OrderTrackingId, OrderMerchantReference, paymentId, plan, months, cycle } =
    req.query as Record<string, string>;

  const trackingId = OrderTrackingId;
  const ref = OrderMerchantReference;

  if (!trackingId || !paymentId) {
    res.redirect("/#/dashboard?tab=subscription&payment=cancelled");
    return;
  }

  try {
    const txStatus = await getTransactionStatus(trackingId);
    const isSuccess =
      txStatus.paymentStatusDescription?.toLowerCase() === "completed" ||
      txStatus.status === "200";

    if (isSuccess) {
      // Find the pending payment
      const [payment] = await db
        .select()
        .from(payments)
        .where(eq(payments.id, paymentId));

      if (payment && payment.status !== "completed") {
        const billingMonths = Number(months) || payment.billingMonths;
        const billingCycle = (cycle as "monthly" | "yearly" | "custom") || "monthly";
        const startDate = toDateStr(new Date());
        const endDate = toDateStr(addMonths(new Date(), billingMonths));

        // Cancel old subscriptions
        await db
          .update(subscriptions)
          .set({ status: "cancelled" })
          .where(and(eq(subscriptions.userId, payment.userId), eq(subscriptions.status, "active")));

        // Create new subscription
        const [newSub] = await db
          .insert(subscriptions)
          .values({
            userId: payment.userId,
            plan: payment.plan,
            status: "active",
            billingCycle,
            billingMonths,
            amountPaid: payment.amount,
            startDate,
            endDate,
          })
          .returning();

        // Update payment record
        await db
          .update(payments)
          .set({
            status: "completed",
            subscriptionId: newSub.id,
            pesapalTrackingId: trackingId,
            paymentMethod: txStatus.paymentMethod,
            merchantReference: ref,
            updatedAt: new Date(),
          })
          .where(eq(payments.id, paymentId));

        // Send renewal confirmation email
        const domains2 = process.env.REPLIT_DOMAINS?.split(",")[0];
        const baseUrl2 = domains2 ? `https://${domains2}` : "https://inndos.com";
        const [ppUser] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, payment.userId)).catch(() => [null]);
        if (ppUser?.email && newSub) {
          const months2 = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
          const ep = newSub.endDate.split("-");
          const expiryFmt2 = `${parseInt(ep[2], 10)} ${months2[parseInt(ep[1], 10) - 1]} ${ep[0]}`;
          sendSubscriptionRenewalConfirmationEmail({
            toEmail:       ppUser.email,
            ownerName:     ppUser.name ?? "Valued Customer",
            planName:      (payment.plan ?? "subscription").charAt(0).toUpperCase() + (payment.plan ?? "subscription").slice(1),
            amount:        payment.amount ?? 0,
            newExpiryDate: expiryFmt2,
            billingCycle:  billingCycle,
            dashboardUrl:  `${baseUrl2}/#/dashboard?tab=subscription`,
          }).catch(() => {});
        }
      }

      res.redirect("/#/dashboard?tab=subscription&payment=success");
    } else {
      await db
        .update(payments)
        .set({ status: "failed", pesapalTrackingId: trackingId, updatedAt: new Date() })
        .where(eq(payments.id, paymentId));

      res.redirect("/#/dashboard?tab=subscription&payment=failed");
    }
  } catch (err) {
    req.log?.error({ err }, "Callback processing error");
    res.redirect("/#/dashboard?tab=subscription&payment=error");
  }
});

// GET /api/subscriptions/ipn  — PesaPal IPN webhook
router.get("/ipn", async (req, res) => {
  const { OrderTrackingId, OrderMerchantReference, OrderNotificationType } =
    req.query as Record<string, string>;

  if (!OrderTrackingId) {
    res.status(400).json({ error: "Missing OrderTrackingId" });
    return;
  }

  try {
    const txStatus = await getTransactionStatus(OrderTrackingId);
    const isSuccess =
      txStatus.paymentStatusDescription?.toLowerCase() === "completed" ||
      txStatus.status === "200";

    // Find the payment by merchant reference
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.merchantReference, OrderMerchantReference ?? ""))
      .limit(1);

    if (payment && payment.status === "pending") {
      if (isSuccess) {
        const billingCycle = "monthly" as const;
        const startDate = toDateStr(new Date());
        const endDate = toDateStr(addMonths(new Date(), payment.billingMonths));

        await db
          .update(subscriptions)
          .set({ status: "cancelled" })
          .where(and(eq(subscriptions.userId, payment.userId), eq(subscriptions.status, "active")));

        const [newSub] = await db
          .insert(subscriptions)
          .values({
            userId: payment.userId,
            plan: payment.plan,
            status: "active",
            billingCycle,
            billingMonths: payment.billingMonths,
            amountPaid: payment.amount,
            startDate,
            endDate,
          })
          .returning();

        await db
          .update(payments)
          .set({
            status: "completed",
            subscriptionId: newSub.id,
            pesapalTrackingId: OrderTrackingId,
            paymentMethod: txStatus.paymentMethod,
            updatedAt: new Date(),
          })
          .where(eq(payments.id, payment.id));
      } else if (
        txStatus.paymentStatusDescription?.toLowerCase() === "failed" ||
        txStatus.paymentStatusDescription?.toLowerCase() === "invalid"
      ) {
        await db
          .update(payments)
          .set({ status: "failed", pesapalTrackingId: OrderTrackingId, updatedAt: new Date() })
          .where(eq(payments.id, payment.id));
      }
    }

    // PesaPal expects a specific response
    res.json({
      orderNotificationType: OrderNotificationType,
      orderTrackingId: OrderTrackingId,
      orderMerchantReference: OrderMerchantReference,
      status: 200,
    });
  } catch (err) {
    req.log?.error({ err }, "IPN processing error");
    res.status(500).json({ error: "IPN processing error" });
  }
});

export default router;
