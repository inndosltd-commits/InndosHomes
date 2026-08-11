/**
 * Subscription renewal reminder job.
 * Runs daily at 08:00 UTC and sends bell, SMS, and email reminders
 * to users whose subscription expires in exactly 7, 3, 2, or 1 day(s).
 */

import { db } from "@workspace/db";
import { subscriptions, subscriptionPlans, users, notifications, propertyTransactions, properties } from "@workspace/db";
import { and, eq, inArray, ne, isNull, lte, or, count } from "drizzle-orm";
import { logger } from "./logger";
import { sendSms } from "./sms";
import { sendSubscriptionReminderEmail, sendTransactionConfirmationEmail, sendSubscriptionExpiredEmail, sendSubscriptionRenewalConfirmationEmail } from "./email";

const REMIND_DAYS = [7, 3, 1];

/** Returns a YYYY-MM-DD date string for today + n days (UTC). */
function utcDatePlusDays(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Formats a YYYY-MM-DD string as a human-readable date, e.g. "06 Aug 2026". */
function formatDate(iso: string): string {
  const [y, m, day] = iso.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${parseInt(day, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
}

export async function runSubscriptionReminders(): Promise<void> {
  logger.info("Running subscription renewal reminder check…");

  const domains = process.env.REPLIT_DOMAINS?.split(",")[0];
  const baseUrl = domains ? `https://${domains}` : "https://inndos.com";
  const renewalUrl = `${baseUrl}/#/dashboard?tab=subscription`;
  const helpUrl    = `${baseUrl}/#/contact`;

  for (const days of REMIND_DAYS) {
    const targetDate = utcDatePlusDays(days);

    const rows = await db
      .select({
        subId:        subscriptions.id,
        userId:       subscriptions.userId,
        plan:         subscriptions.plan,
        amountPaid:   subscriptions.amountPaid,
        endDate:      subscriptions.endDate,
        planDisplay:  subscriptionPlans.displayName,
        userName:     users.name,
        userEmail:    users.email,
        userPhone:    users.phone,
      })
      .from(subscriptions)
      .leftJoin(subscriptionPlans, eq(subscriptions.plan, subscriptionPlans.name))
      .leftJoin(users, eq(subscriptions.userId, users.id))
      .where(
        and(
          eq(subscriptions.endDate, targetDate),
          eq(subscriptions.status, "active"),
          ne(subscriptions.plan, "free")
        )
      );

    if (rows.length === 0) continue;
    logger.info({ daysLeft: days, count: rows.length, targetDate }, "Sending subscription reminders");

    // Fetch active listing counts per user for context
    const listingCounts: Record<string, number> = {};
    for (const row of rows) {
      try {
        const [{ c }] = await db.select({ c: count() }).from(properties).where(
          and(eq(properties.ownerId, row.userId), ne(properties.propertyStatus, "sold"))
        );
        listingCounts[row.userId] = Number(c);
      } catch { listingCounts[row.userId] = 0; }
    }

    for (const row of rows) {
      const clientName    = row.userName ?? "Valued Customer";
      const planName      = row.planDisplay ?? row.plan ?? "Subscription";
      const amount        = row.amountPaid ?? 0;
      const expiryFmt     = formatDate(row.endDate);
      const activeListings = listingCounts[row.userId] ?? 0;

      // Per-urgency SMS copy
      const smsMsg = days === 1
        ? `🚨 FINAL WARNING inndos: Your subscription expires TOMORROW (${expiryFmt}). Renew immediately to keep your ${activeListings} listing${activeListings === 1 ? "" : "s"} active: ${renewalUrl}`
        : days <= 3
        ? `⚠️ URGENT inndos: Your ${planName} subscription expires in ${days} days (${expiryFmt}). Renew now – your listings will be hidden after expiry: ${renewalUrl}`
        : `🏠 inndos: Your ${planName} subscription expires in ${days} days on ${expiryFmt}. Renew to keep your listings visible to seekers: ${renewalUrl}`;

      // Per-urgency bell copy
      const bellMsg = days === 1
        ? `🚨 Final warning: Your subscription expires tomorrow. Renew immediately to keep your listings active.`
        : days <= 3
        ? `⚠️ Urgent: Your subscription expires in ${days} days on ${expiryFmt}. Renew now to avoid losing active leads.`
        : `Your ${planName} subscription expires in ${days} days (${expiryFmt}). Tap to renew and keep your listings visible.`;

      // 1 — Bell notification
      try {
        await db.insert(notifications).values({
          userId:  row.userId,
          type:    "subscription_reminder",
          message: bellMsg,
          isRead:  false,
        });
      } catch (err) {
        logger.error({ err, userId: row.userId }, "Failed to insert subscription reminder notification");
      }

      // 2 — SMS
      if (row.userPhone) {
        sendSms(row.userPhone, smsMsg).catch((err: unknown) =>
          logger.error({ err, userId: row.userId }, "Failed to send subscription reminder SMS")
        );
      }

      // 3 — Email
      if (row.userEmail) {
        sendSubscriptionReminderEmail({
          toEmail:       row.userEmail,
          clientName,
          planName,
          amount,
          expiryDate:    expiryFmt,
          renewalUrl,
          helpUrl,
          daysLeft:      days,
          activeListings,
        }).catch((err: unknown) =>
          logger.error({ err, userId: row.userId }, "Failed to send subscription reminder email")
        );
      }
    }
  }


  // ── Expiry-on-day notification (EXP-004) ──
  const todayDate = utcDatePlusDays(0);
  const expiredRows = await db
    .select({
      userId:      subscriptions.userId,
      plan:        subscriptions.plan,
      endDate:     subscriptions.endDate,
      planDisplay: subscriptionPlans.displayName,
      amountPaid:  subscriptions.amountPaid,
      userName:    users.name,
      userEmail:   users.email,
      userPhone:   users.phone,
    })
    .from(subscriptions)
    .leftJoin(subscriptionPlans, eq(subscriptions.plan, subscriptionPlans.name))
    .leftJoin(users, eq(subscriptions.userId, users.id))
    .where(
      and(
        eq(subscriptions.endDate, todayDate),
        eq(subscriptions.status, "active"),
        ne(subscriptions.plan, "free")
      )
    );

  if (expiredRows.length > 0) {
    logger.info({ count: expiredRows.length }, "Sending expiry-on-day notifications");
    for (const row of expiredRows) {
      const ownerName     = row.userName ?? "Valued Customer";
      const planName      = row.planDisplay ?? row.plan ?? "Subscription";
      const expiryFmt     = formatDate(row.endDate);
      const reactivateUrl = renewalUrl;
      let activeListings  = 0;
      try {
        const [{ c }] = await db.select({ c: count() }).from(properties).where(eq(properties.ownerId, row.userId));
        activeListings = Number(c);
      } catch { /* ignore */ }

      const bellMsg = `⚠️ Your subscription has expired. Your ${activeListings} listing${activeListings === 1 ? " is" : "s are"} now hidden. Reactivate from your dashboard to go live again.`;
      const smsMsg  = `⚠️ inndos: Your subscription has EXPIRED. Your listings are now hidden from seekers. Reactivate immediately: ${reactivateUrl}`;

      try {
        await db.insert(notifications).values({
          userId: row.userId, type: "subscription_expired", message: bellMsg, isRead: false,
        });
      } catch (err) {
        logger.error({ err, userId: row.userId }, "Failed to insert expiry notification");
      }

      if (row.userPhone) {
        sendSms(row.userPhone, smsMsg).catch(() => {});
      }

      if (row.userEmail) {
        sendSubscriptionExpiredEmail({
          toEmail:       row.userEmail,
          ownerName,
          planName,
          expiryDate:    expiryFmt,
          activeListings,
          reactivateUrl,
        }).catch((err: unknown) =>
          logger.error({ err, userId: row.userId }, "Failed to send subscription expired email")
        );
      }
    }
  }

  logger.info("Subscription renewal reminder check complete");
}

// ─── Transaction Confirmation Reminders ───────────────────────────────────────

const PENDING_TX_STATUSES = [
  "pending_confirmation",
  "confirmed_by_owner_only",
  "confirmed_by_tenant_only",
];

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function runTransactionConfirmationReminders(): Promise<void> {
  logger.info("Running transaction confirmation reminder check…");

  const domains = process.env.REPLIT_DOMAINS?.split(",")[0];
  const baseUrl = domains ? `https://${domains}` : "https://inndos.com";
  const dashboardUrl = `${baseUrl}/#/dashboard`;

  for (const days of [1, 3] as const) {
    const cutoff = daysAgo(days);
    const nextCutoff = daysAgo(days - 1);

    // Find transactions created approximately `days` days ago that haven't had this reminder sent
    const rows = await db
      .select()
      .from(propertyTransactions)
      .where(
        and(
          lte(propertyTransactions.createdAt, cutoff),
          ...(days === 1
            ? [isNull(propertyTransactions.reminder1SentAt)]
            : [isNull(propertyTransactions.reminder3SentAt)])
        )
      );

    const pending = rows.filter(r => PENDING_TX_STATUSES.includes(r.status));
    if (pending.length === 0) continue;

    logger.info({ daysElapsed: days, count: pending.length }, "Sending transaction confirmation reminders");

    for (const tx of pending) {
      // Determine who still needs to confirm
      const needsOwner = tx.ownerConfirmation === "pending";
      const needsTenant = tx.tenantConfirmation === "pending";
      const targets: string[] = [];
      if (needsOwner) targets.push(tx.ownerId);
      if (needsTenant) targets.push(tx.tenantId);
      if (targets.length === 0) continue;

      const msg = `⏰ Reminder: Please confirm the ${tx.transactionType} for "${tx.propertyTitle}" on your dashboard (${days} day${days === 1 ? "" : "s"} after link-up).`;

      for (const uid of targets) {
        try {
          await db.insert(notifications).values({
            userId: uid,
            type: "transaction_confirmation_prompt",
            message: msg,
            isRead: false,
          });
          const [u] = await db.select({ phone: users.phone, email: users.email, name: users.name }).from(users).where(eq(users.id, uid));
          if (u?.phone) sendSms(u.phone, msg).catch(() => {});
          if (u?.email) {
            sendTransactionConfirmationEmail({
              toEmail: u.email,
              toName: u.name ?? "User",
              propertyTitle: tx.propertyTitle,
              transactionType: tx.transactionType as "rental" | "sale",
              eventType: "reminder",
              dashboardUrl,
              daysElapsed: days,
            }).catch(() => {});
          }
        } catch (err) {
          logger.error({ err, txId: tx.id, userId: uid }, "Failed to send transaction reminder");
        }
      }

      // Mark reminder as sent
      const updateField = days === 1 ? { reminder1SentAt: new Date() } : { reminder3SentAt: new Date() };
      await db.update(propertyTransactions).set(updateField).where(eq(propertyTransactions.id, tx.id)).catch(() => {});
    }
  }

  logger.info("Transaction confirmation reminder check complete");
}

/** Schedules the reminder job to run at 08:00 UTC every day. */
export function startSubscriptionReminderJob(): void {
  function msUntilNext8amUtc(): number {
    const now   = new Date();
    const next  = new Date(Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 8, 0, 0, 0
    ));
    if (next.getTime() <= now.getTime()) {
      next.setUTCDate(next.getUTCDate() + 1);
    }
    return next.getTime() - now.getTime();
  }

  const delay = msUntilNext8amUtc();
  logger.info(
    { firstRunIn: `${Math.round(delay / 60000)} min` },
    "Subscription reminder job scheduled (daily at 08:00 UTC)"
  );

  setTimeout(function tick() {
    runSubscriptionReminders().catch((err: unknown) =>
      logger.error({ err }, "Subscription reminder job failed")
    );
    runTransactionConfirmationReminders().catch((err: unknown) =>
      logger.error({ err }, "Transaction confirmation reminder job failed")
    );
    // Re-schedule for the next day
    setTimeout(tick, msUntilNext8amUtc());
  }, delay);
}
