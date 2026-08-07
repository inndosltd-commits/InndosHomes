/**
 * Subscription renewal reminder job.
 * Runs daily at 08:00 UTC and sends bell, SMS, and email reminders
 * to users whose subscription expires in exactly 7, 3, 2, or 1 day(s).
 */

import { db } from "@workspace/db";
import { subscriptions, subscriptionPlans, users, notifications, propertyTransactions } from "@workspace/db";
import { and, eq, inArray, ne, isNull, lte, or } from "drizzle-orm";
import { logger } from "./logger";
import { sendSms } from "./sms";
import { sendSubscriptionReminderEmail, sendTransactionConfirmationEmail } from "./email";

const REMIND_DAYS = [7, 3, 2, 1];

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

    for (const row of rows) {
      const clientName = row.userName ?? "Valued Customer";
      const planName   = row.planDisplay ?? row.plan ?? "Subscription";
      const amount     = row.amountPaid ?? 0;
      const expiryFmt  = formatDate(row.endDate);
      const smsMsg     = `Dear ${clientName}, your inndos ${planName} subscription (KES ${amount.toLocaleString()}) expires on ${expiryFmt}. Renew now to avoid interruption: ${renewalUrl}`;
      const bellMsg    = `Your ${planName} subscription expires on ${expiryFmt} (${days} day${days === 1 ? "" : "s"} left). Tap to renew now.`;

      // 1 — Bell notification
      try {
        await db.insert(notifications).values({
          userId:   row.userId,
          type:     "subscription_reminder",
          message:  bellMsg,
          isRead:   false,
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
          toEmail:    row.userEmail,
          clientName,
          planName,
          amount,
          expiryDate: expiryFmt,
          renewalUrl,
          helpUrl,
          daysLeft:   days,
        }).catch((err: unknown) =>
          logger.error({ err, userId: row.userId }, "Failed to send subscription reminder email")
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
