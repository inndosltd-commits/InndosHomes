import { Router, type Response } from "express";
import { db } from "@workspace/db";
import { subscriptions, users, properties, payments, settings, subscriptionPlans, featuredListingUses } from "@workspace/db";
import { eq, and, desc, count, inArray, sql } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";
import { sendSubscriptionRenewalConfirmationEmail } from "../lib/email";
import { getDashboardUrl, getWebsiteUrl } from "../lib/appUrl";
import {
  submitOrder,
  getTransactionStatus,
  getPesapalConfig,
  registerIPN,
} from "../services/pesapal";
import {
  getPesapalPaymentState,
  isCompletedPesapalPayment,
  parsePesapalDate,
  type PesapalTransactionStatus,
} from "../services/pesapal-status";

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
  features: string[];
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
        features: r.features,
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
        discoveryEnabled: k !== "free", searchBoost: 0,
        phoneSupport: k === "enterprise",
        features: ({
          free: [
            "Up to 3 listings", "5 photos per listing", "No video / virtual tour",
            "0 featured listings per month", "No brand-profile search", "No dedicated phone support",
          ],
          basic: [
            "Up to 7 listings", "10 photos per listing", "No video / virtual tour",
            "1 featured listing per month", "Brand-profile search", "No dedicated phone support",
          ],
          pro: [
            "Up to 15 listings", "20 photos per listing", "1 video / virtual tour per listing",
            "3 featured listings per month", "Brand-profile search",
          ],
          enterprise: [
            "Unlimited listings", "Unlimited photos per listing", "5 videos / virtual tours per listing",
            "Negotiated featured allocation", "Brand-profile search", "24/7 phone support",
            "Dedicated account manager",
          ],
        } as Record<string, string[]>)[k] ?? [],
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

export async function getUserPlanEntitlements(userId: string) {
  const subscription = await getActiveSubscription(userId);
  const plan = subscription?.plan ?? "free";
  return {
    plan,
    entitlements: await getPlanEntitlements(plan),
  };
}

export function getPlanLimit(plan: string): number {
  return DEFAULT_PLAN_LIMITS[plan] ?? 3;
}

function redirectAfterPayment(
  res: Response,
  state: "success" | "pending" | "failed" | "cancelled" | "error",
  returnTarget?: string,
  paymentId?: string
) {
  if (returnTarget === "mobile") {
    const payment = paymentId ? `&paymentId=${encodeURIComponent(paymentId)}` : "";
    res.redirect(`inndos-mobile://subscription?payment=${state}${payment}`);
    return;
  }
  const payment = paymentId ? `&paymentId=${encodeURIComponent(paymentId)}` : "";
  res.redirect(getWebsiteUrl(`/#/dashboard?tab=subscription&payment=${state}${payment}`));
}

export async function getPlanEntitlements(plan: string): Promise<PlanEntitlements> {
  const plans = await getPlansConfig();
  return plans[plan] ?? plans.free ?? {
    price: 0, limit: 3, imageLimit: 5, videoLimit: 0, featuredLimit: 0,
    discoveryEnabled: false, searchBoost: 0, phoneSupport: false, features: [],
  };
}

type StoredPayment = typeof payments.$inferSelect;
type PesapalStatus = PesapalTransactionStatus;

export type PaymentReconciliationState = "completed" | "pending" | "failed" | "cancelled" | "error";

function paymentMatchesGateway(
  payment: StoredPayment,
  trackingId: string,
  merchantReference: string,
  status: PesapalStatus
): boolean {
  if (!payment.pesapalTrackingId || payment.pesapalTrackingId !== trackingId) return false;
  if (!payment.merchantReference || payment.merchantReference !== merchantReference) return false;
  if (!status.merchantReference || status.merchantReference !== payment.merchantReference) return false;
  if (!Number.isFinite(status.amount) || status.amount !== payment.amount) return false;
  if (!status.currency || status.currency.toUpperCase() !== payment.currency.toUpperCase()) return false;
  return true;
}

async function persistGatewayStatus(payment: StoredPayment, status: PesapalStatus) {
  await db
    .update(payments)
    .set({
      gatewayStatus: status.status || payment.gatewayStatus,
      gatewayDescription: status.paymentStatusDescription || status.description || payment.gatewayDescription,
      paymentMethod: status.paymentMethod || payment.paymentMethod,
      updatedAt: new Date(),
    })
    .where(eq(payments.id, payment.id));
}

async function finalizePaidSubscription(
  payment: StoredPayment,
  trackingId: string,
  status: PesapalStatus
) {
  const confirmedAt = parsePesapalDate(status.confirmedDate) ?? new Date();
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`subscription:${payment.userId}`}))`);
    const [claimedPayment] = await tx
      .update(payments)
      .set({
        status: "completed",
        paymentMethod: status.paymentMethod || payment.paymentMethod,
        gatewayStatus: status.status || payment.gatewayStatus,
        gatewayDescription: status.paymentStatusDescription || status.description || payment.gatewayDescription,
        confirmedAt,
        updatedAt: new Date(),
      })
      .where(and(
        eq(payments.id, payment.id),
        inArray(payments.status, ["pending", "failed"]),
        eq(payments.pesapalTrackingId, trackingId)
      ))
      .returning();

    if (!claimedPayment) return null;

    const billingCycle =
      payment.billingMonths === 12 ? "yearly" as const :
      payment.billingMonths === 1 ? "monthly" as const :
      "custom" as const;
    const startDate = toDateStr(new Date());
    const endDate = toDateStr(addMonths(new Date(), payment.billingMonths));

    await tx
      .update(subscriptions)
      .set({ status: "cancelled" })
      .where(and(eq(subscriptions.userId, payment.userId), eq(subscriptions.status, "active")));

    const [newSubscription] = await tx
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

    await tx
      .update(payments)
      .set({ subscriptionId: newSubscription.id })
      .where(eq(payments.id, payment.id));

    return newSubscription;
  });
}

type ReconciliationResult = {
  state: PaymentReconciliationState;
  payment: StoredPayment;
  subscriptionCreated: boolean;
};

async function reloadPayment(paymentId: string): Promise<StoredPayment> {
  const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  if (!payment) throw new Error("Payment disappeared during reconciliation");
  return payment;
}

async function reconcilePayment(
  payment: StoredPayment,
  trackingId = payment.pesapalTrackingId ?? "",
  merchantReference = payment.merchantReference ?? "",
): Promise<ReconciliationResult> {
  if (!trackingId || !merchantReference) {
    return {
      state: payment.status === "failed" ? "failed" : "pending",
      payment,
      subscriptionCreated: false,
    };
  }

  const gatewayStatus = await getTransactionStatus(trackingId);
  if (!paymentMatchesGateway(payment, trackingId, merchantReference, gatewayStatus)) {
    return { state: "error", payment, subscriptionCreated: false };
  }

  const gatewayState = getPesapalPaymentState(gatewayStatus);
  if (gatewayState === "completed" && payment.status !== "cancelled") {
    if (payment.status === "pending" || payment.status === "failed") {
      const newSubscription = await finalizePaidSubscription(payment, trackingId, gatewayStatus);
      const refreshedPayment = await reloadPayment(payment.id);
      return {
        state: "completed",
        payment: refreshedPayment,
        subscriptionCreated: Boolean(newSubscription),
      };
    }

    await db
      .update(payments)
      .set({
        gatewayStatus: gatewayStatus.status || payment.gatewayStatus,
        gatewayDescription: gatewayStatus.paymentStatusDescription || gatewayStatus.description || payment.gatewayDescription,
        paymentMethod: gatewayStatus.paymentMethod || payment.paymentMethod,
        confirmedAt: payment.confirmedAt ?? parsePesapalDate(gatewayStatus.confirmedDate) ?? new Date(),
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id));
    return { state: "completed", payment: await reloadPayment(payment.id), subscriptionCreated: false };
  }

  await persistGatewayStatus(payment, gatewayStatus);
  if (
    payment.status === "pending" &&
    (gatewayState === "failed" || gatewayState === "cancelled")
  ) {
    await db
      .update(payments)
      .set({ status: gatewayState, updatedAt: new Date() })
      .where(and(eq(payments.id, payment.id), eq(payments.status, "pending")));
  }

  const refreshedPayment = await reloadPayment(payment.id);
  return {
    state: refreshedPayment.status === "completed"
      ? "completed"
      : refreshedPayment.status === "cancelled"
      ? "cancelled"
      : refreshedPayment.status === "failed"
        ? "failed"
        : "pending",
    payment: refreshedPayment,
    subscriptionCreated: false,
  };
}

async function calcAmount(plan: string, cycle: string, months: number): Promise<number> {
  const plans = await getPlansConfig();
  const pricePerMonth = plans[plan]?.price ?? DEFAULT_PLAN_PRICES[plan] ?? 0;
  const yearlyDiscount = cycle === "yearly" ? Math.round(pricePerMonth * 0.1 * 12) : 0; // 10% yearly discount
  return Math.max(0, pricePerMonth * months - yearlyDiscount);
}

function getPaymentCallbackOrigin(): string {
  const configuredOrigin = process.env.PESAPAL_CALLBACK_ORIGIN?.trim();
  if (configuredOrigin) return configuredOrigin.replace(/\/+$/, "");
  return getWebsiteUrl("/").replace(/\/+$/, "");
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
  const planName = sub?.plan ?? "free";
  const entitlements = await getPlanEntitlements(planName);
  const featuredAllowance = planName === "enterprise"
    ? (sub?.featuredLimitOverride ?? 0)
    : entitlements.featuredLimit;
  const monthKey = new Date().toISOString().slice(0, 7);
  const [{ featuredUsed }] = await db
    .select({ featuredUsed: count() })
    .from(featuredListingUses)
    .where(and(eq(featuredListingUses.userId, userId), eq(featuredListingUses.monthKey, monthKey)));
  const allowanceSummary = {
    featuredAllowance,
    featuredUsed: Number(featuredUsed),
    featuredRemaining: Math.max(0, featuredAllowance - Number(featuredUsed)),
    featuredMonth: monthKey,
  };

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
      ...entitlements,
      ...allowanceSummary,
    });
    return;
  }

  res.json({
    ...sub,
    listingCount: Number(listingCount),
    listingLimit: plans[sub.plan]?.limit ?? getPlanLimit(sub.plan),
    ...entitlements,
    ...allowanceSummary,
  });
});

// POST /api/subscriptions/upgrade  (Free-plan downgrade only)
router.post("/upgrade", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { plan } = req.body as {
    plan?: string;
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
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`subscription:${userId}`}))`);
      await tx
        .update(subscriptions)
        .set({ status: "cancelled" })
        .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")));
    });

    res.json({ plan: "free", status: "active", message: "Downgraded to Free Plan" });
    return;
  }

  // Paid subscriptions are created only after PesaPal confirms payment in
  // the callback or IPN handlers below. This also protects stale clients and
  // direct API callers that still know about the former manual activation.
  res.status(402).json({
    error: "Payment is required to activate a paid subscription. Start checkout instead.",
    code: "PAYMENT_REQUIRED",
  });
});

// POST /api/subscriptions/checkout  — initiate PesaPal payment
router.post("/checkout", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { plan, billingCycle, months, returnTarget } = req.body as {
    plan?: string;
    billingCycle?: string;
    months?: number;
    returnTarget?: string;
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
  if (!Number.isFinite(amount) || amount <= 0) {
    res.status(400).json({ error: "This plan is not currently available for online payment.", code: "INVALID_PLAN_PRICE" });
    return;
  }

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

  // PesaPal must be able to reach these URLs from the public internet. Do not
  // use the incoming request host: mobile requests and proxied requests can
  // expose an internal or development host that PesaPal cannot call.
  const baseUrl = getPaymentCallbackOrigin();
  const callbackUrl = `${baseUrl}/api/subscriptions/callback?paymentId=${payment.id}&plan=${plan}&months=${billingMonths}&cycle=${cycle}${returnTarget === "mobile" ? "&returnTarget=mobile" : ""}`;
  const ipnUrl = `${baseUrl}/api/subscriptions/ipn`;

  try {
    const orderRequest = {
      merchantReference,
      amount,
      description: payment.description ?? `${plan} Plan`,
      callbackUrl,
      userEmail: user.email,
      userFirstName: firstName,
      userLastName: lastName,
      currency: "KES",
    };
    let order;
    try {
      order = await submitOrder(orderRequest);
    } catch (firstError) {
      const firstMessage = firstError instanceof Error ? firstError.message : "";
      if (!/notification|ipn/i.test(firstMessage) || /registration failed/i.test(firstMessage)) throw firstError;
      req.log?.warn({ paymentId: payment.id }, "Refreshing stale PesaPal IPN registration and retrying checkout");
      await registerIPN(ipnUrl);
      order = await submitOrder(orderRequest);
    }
    const { redirectUrl, orderTrackingId } = order;

    // Save tracking ID
    await db
      .update(payments)
      .set({ pesapalTrackingId: orderTrackingId, pesapalOrderId: merchantReference })
      .where(eq(payments.id, payment.id));

    res.json({ redirectUrl, paymentId: payment.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "PesaPal error";
    await db
      .update(payments)
      .set({ status: "failed", gatewayDescription: msg.slice(0, 500), updatedAt: new Date() })
      .where(and(eq(payments.id, payment.id), eq(payments.status, "pending")));
    req.log?.error({ err }, "PesaPal checkout failed");
    res.status(502).json({ error: msg });
  }
});

// GET /api/subscriptions/payments/:paymentId — mobile clients poll this after
// returning from the payment browser, without exposing another user's payment.
router.get("/payments/:paymentId", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const [storedPayment] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.id, req.params.paymentId), eq(payments.userId, userId)))
    .limit(1);
  if (!storedPayment) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }

  let payment = storedPayment;
  if (
    (payment.status === "pending" || payment.status === "failed") &&
    payment.pesapalTrackingId &&
    payment.merchantReference
  ) {
    try {
      const reconciliation = await reconcilePayment(payment);
      payment = reconciliation.payment;
    } catch (error) {
      req.log?.warn({ error, paymentId: payment.id }, "Could not reconcile pending PesaPal payment during status poll");
    }
  }

  res.json({
    id: payment.id,
    status: payment.status,
    plan: payment.plan,
    amount: payment.amount,
    paymentMethod: payment.paymentMethod,
    confirmedAt: payment.confirmedAt,
    gatewayStatus: payment.gatewayStatus,
    gatewayDescription: payment.gatewayDescription,
    updatedAt: payment.updatedAt,
  });
});

// GET /api/subscriptions/callback  — PesaPal redirect after payment
router.get("/callback", async (req, res) => {
  const { OrderTrackingId, OrderMerchantReference, paymentId, returnTarget } =
    req.query as Record<string, string>;

  const trackingId = OrderTrackingId;
  const ref = OrderMerchantReference;

  if (!trackingId || !ref || !paymentId) {
    redirectAfterPayment(res, "cancelled", returnTarget, paymentId);
    return;
  }

  try {
    const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
    if (!payment) {
      redirectAfterPayment(res, "error", returnTarget, paymentId);
      return;
    }

    const reconciliation = await reconcilePayment(payment, trackingId, ref);
    if (reconciliation.state === "error") {
      req.log?.warn({ paymentId, trackingId }, "Rejected mismatched PesaPal callback");
      redirectAfterPayment(res, "error", returnTarget, paymentId);
      return;
    }

    if (reconciliation.subscriptionCreated) {
      const newSub = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, payment.userId))
        .orderBy(desc(subscriptions.createdAt))
        .limit(1)
        .then(([subscription]) => subscription);
      if (newSub) {
        const billingCycle = newSub.billingCycle ?? "monthly";
        // Send renewal confirmation email
        const [ppUser] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, payment.userId)).catch(() => [null]);
        if (ppUser?.email) {
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
            dashboardUrl:  getDashboardUrl("subscription"),
          }).catch(() => {});
        }
      }
    }
    redirectAfterPayment(
      res,
      reconciliation.state === "completed" ? "success" : reconciliation.state,
      returnTarget,
      paymentId,
    );
  } catch (err) {
    req.log?.error({ err }, "Callback processing error");
    redirectAfterPayment(res, "error", returnTarget, paymentId);
  }
});

// GET /api/subscriptions/ipn  — PesaPal IPN webhook
router.get("/ipn", async (req, res) => {
  const { OrderTrackingId, OrderMerchantReference, OrderNotificationType } =
    req.query as Record<string, string>;

  if (!OrderTrackingId || !OrderMerchantReference) {
    res.status(400).json({ error: "Missing payment identifiers" });
    return;
  }

  try {
    // Find the payment by merchant reference
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.merchantReference, OrderMerchantReference ?? ""))
      .limit(1);

    if (!payment) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }

    const reconciliation = await reconcilePayment(payment, OrderTrackingId, OrderMerchantReference);
    if (reconciliation.state === "error") {
      req.log?.warn({ paymentId: payment.id, trackingId: OrderTrackingId }, "Rejected mismatched PesaPal IPN");
      res.status(400).json({ error: "Payment identifiers do not match" });
      return;
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
