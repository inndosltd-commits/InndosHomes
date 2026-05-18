import { Router } from "express";
import { db } from "@workspace/db";
import { subscriptions, users, properties } from "@workspace/db";
import { eq, and, desc, count } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";

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

  const pricePerMonth = PLAN_PRICES[plan] ?? 0;
  const discount = cycle === "yearly" ? 2 : 0;
  const amountPaid = pricePerMonth * billingMonths - discount * 12 * (cycle === "yearly" ? 1 : 0);

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
      amountPaid: Math.max(0, amountPaid),
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

export default router;
