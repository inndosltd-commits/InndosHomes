import { Router } from "express";
import { db } from "@workspace/db";
import { subscriptions, users, properties, payments, settings } from "@workspace/db";
import { eq, and, desc, count, asc } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";
import {
  submitOrder,
  getTransactionStatus,
  getPesapalConfig,
  registerIPN,
} from "../services/pesapal";

const router = Router();

const PLAN_LIMITS: Record<string, number> = {
  standard: 3,
  silver: 7,
  gold: Infinity,
};

const PLAN_PRICES: Record<string, number> = {
  standard: 0,
  silver: 200,
  gold: 300,
};

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
  return PLAN_LIMITS[plan] ?? 3;
}

function calcAmount(plan: string, cycle: string, months: number): number {
  const pricePerMonth = PLAN_PRICES[plan] ?? 0;
  const discount = cycle === "yearly" ? (plan === "gold" ? 24 : 16) : 0;
  return Math.max(0, pricePerMonth * months - discount);
}

// GET /api/subscriptions/me
router.get("/me", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const sub = await getActiveSubscription(userId);
  const [{ listingCount }] = await db
    .select({ listingCount: count() })
    .from(properties)
    .where(eq(properties.ownerId, userId));

  if (!sub) {
    res.json({
      plan: "standard",
      status: "active",
      billingCycle: "monthly",
      billingMonths: 0,
      amountPaid: 0,
      startDate: toDateStr(new Date()),
      endDate: "9999-12-31",
      listingCount: Number(listingCount),
      listingLimit: PLAN_LIMITS.standard,
    });
    return;
  }

  res.json({
    ...sub,
    listingCount: Number(listingCount),
    listingLimit: getPlanLimit(sub.plan),
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

  if (!plan || !["standard", "silver", "gold"].includes(plan)) {
    res.status(400).json({ error: "plan must be standard, silver, or gold" });
    return;
  }

  if (plan === "standard") {
    await db
      .update(subscriptions)
      .set({ status: "cancelled" })
      .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")));

    res.json({ plan: "standard", status: "active", message: "Downgraded to Standard (Free)" });
    return;
  }

  const cycle = billingCycle && ["monthly", "yearly", "custom"].includes(billingCycle)
    ? (billingCycle as "monthly" | "yearly" | "custom")
    : "monthly";

  let billingMonths = 1;
  if (cycle === "yearly") billingMonths = 12;
  else if (cycle === "custom" && months && months >= 1) billingMonths = Math.floor(months);

  const amountPaid = calcAmount(plan, cycle, billingMonths);
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
      plan: plan as "silver" | "gold",
      status: "active",
      billingCycle: cycle,
      billingMonths,
      amountPaid,
      startDate,
      endDate,
    })
    .returning();

  res.status(201).json({
    ...newSub,
    listingLimit: getPlanLimit(plan),
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

  if (!plan || !["silver", "gold"].includes(plan)) {
    res.status(400).json({ error: "plan must be silver or gold" });
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

  const amount = calcAmount(plan, cycle, billingMonths);

  const merchantReference = `INNDOS-${userId.slice(0, 8).toUpperCase()}-${Date.now()}`;

  // Create pending payment record
  const [payment] = await db
    .insert(payments)
    .values({
      userId,
      pesapalOrderId: merchantReference,
      merchantReference,
      amount,
      plan: plan as "silver" | "gold",
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
