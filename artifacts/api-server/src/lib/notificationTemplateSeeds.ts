/**
 * Default notification templates — seeded into notification_templates on startup.
 * Uses INSERT ... ON CONFLICT (key) DO NOTHING so admin edits are preserved.
 */

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";
import { rewritePreviewUrls } from "./appUrl";

export interface TemplateSeed {
  key: string;
  category: "subscription" | "booking" | "listing" | "auth" | "transaction";
  channel: "sms" | "bell" | "email";
  label: string;
  subject?: string | null;
  body: string;
  ctaLabel?: string | null;
  variables: { name: string; description: string }[];
}

const SUBSCRIPTION_VARS = [
  { name: "ownerName",      description: "Property owner's full name" },
  { name: "planName",       description: "Subscription plan (e.g. Pro, Basic)" },
  { name: "expiryDate",     description: "Formatted expiry date (e.g. 18 Aug 2026)" },
  { name: "amount",         description: "Renewal amount in KES" },
  { name: "activeListings", description: "Number of active listings affected" },
  { name: "dashboardUrl",   description: "Link to the subscription dashboard" },
  { name: "daysLeft",       description: "Number of days until expiry" },
];

const BOOKING_VARS = [
  { name: "guestName",      description: "Name of the person requesting the link-up" },
  { name: "ownerName",      description: "Property owner's name" },
  { name: "propertyTitle",  description: "Listing/property title" },
  { name: "startDate",      description: "Booking start date" },
  { name: "endDate",        description: "Booking end date" },
  { name: "dashboardUrl",   description: "Link to the dashboard" },
];

const LISTING_VARS = [
  { name: "ownerName",       description: "Property owner's name" },
  { name: "propertyTitle",   description: "Listing/property title" },
  { name: "rejectionReason", description: "Reason provided for rejection (listing.rejected only)" },
  { name: "dashboardUrl",    description: "Link to the dashboard" },
];

const AUTH_VARS = [
  { name: "userName",  description: "New user's full name" },
  { name: "userEmail", description: "New user's email address" },
  { name: "userRole",  description: "Role the user registered as (owner/tenant/etc.)" },
];

export const TEMPLATE_SEEDS: TemplateSeed[] = [
  // ── SUBSCRIPTION — 7-Day Reminder ──────────────────────────────────────────
  {
    key: "subscription.reminder.7day.sms",
    category: "subscription", channel: "sms",
    label: "7-Day Subscription Reminder (SMS)",
    body: "🏠 inndos: Dear {{ownerName}}, your {{planName}} subscription expires in 7 days on {{expiryDate}}. Renew now to keep your {{activeListings}} listing(s) visible to seekers: {{dashboardUrl}}",
    variables: SUBSCRIPTION_VARS,
  },
  {
    key: "subscription.reminder.7day.bell",
    category: "subscription", channel: "bell",
    label: "7-Day Subscription Reminder (Bell)",
    body: "Your {{planName}} subscription expires in 7 days ({{expiryDate}}). Tap to renew and keep your listings visible to seekers.",
    variables: SUBSCRIPTION_VARS,
  },
  {
    key: "subscription.reminder.7day.email",
    category: "subscription", channel: "email",
    label: "7-Day Subscription Reminder (Email)",
    subject: "⏰ Reminder: Your inndos {{planName}} subscription expires in 7 days",
    body: "Hi {{ownerName}}, this is a friendly reminder that your inndos <strong>{{planName}}</strong> subscription expires on <strong>{{expiryDate}}</strong>. Renew now to stay connected with seekers and keep your {{activeListings}} listing(s) visible.",
    ctaLabel: "Renew My Subscription",
    variables: SUBSCRIPTION_VARS,
  },

  // ── SUBSCRIPTION — 3-Day Reminder ──────────────────────────────────────────
  {
    key: "subscription.reminder.3day.sms",
    category: "subscription", channel: "sms",
    label: "3-Day Subscription Reminder (SMS)",
    body: "⚠️ URGENT inndos: Dear {{ownerName}}, your {{planName}} subscription expires in 3 days on {{expiryDate}}. Renew now — your {{activeListings}} listing(s) will be hidden after expiry: {{dashboardUrl}}",
    variables: SUBSCRIPTION_VARS,
  },
  {
    key: "subscription.reminder.3day.bell",
    category: "subscription", channel: "bell",
    label: "3-Day Subscription Reminder (Bell)",
    body: "⚠️ Urgent: Your {{planName}} subscription expires in 3 days on {{expiryDate}}. Renew now to avoid losing active leads.",
    variables: SUBSCRIPTION_VARS,
  },
  {
    key: "subscription.reminder.3day.email",
    category: "subscription", channel: "email",
    label: "3-Day Subscription Reminder (Email)",
    subject: "⚠️ URGENT: Your inndos subscription expires in 3 days – Renew Now",
    body: "Hi {{ownerName}}, your inndos subscription expires in just <strong>3 days on {{expiryDate}}</strong>. Renew now to keep your {{activeListings}} listing(s) visible and your leads flowing.",
    ctaLabel: "Renew My Subscription",
    variables: SUBSCRIPTION_VARS,
  },

  // ── SUBSCRIPTION — 1-Day (Final Warning) ───────────────────────────────────
  {
    key: "subscription.reminder.1day.sms",
    category: "subscription", channel: "sms",
    label: "1-Day Final Warning (SMS)",
    body: "🚨 FINAL WARNING inndos: Dear {{ownerName}}, your subscription expires TOMORROW ({{expiryDate}}). Renew immediately to keep your {{activeListings}} listing(s) active: {{dashboardUrl}}",
    variables: SUBSCRIPTION_VARS,
  },
  {
    key: "subscription.reminder.1day.bell",
    category: "subscription", channel: "bell",
    label: "1-Day Final Warning (Bell)",
    body: "🚨 Final warning: Your subscription expires tomorrow. Renew immediately to keep your listings active.",
    variables: SUBSCRIPTION_VARS,
  },
  {
    key: "subscription.reminder.1day.email",
    category: "subscription", channel: "email",
    label: "1-Day Final Warning (Email)",
    subject: "🚨 FINAL WARNING: Your inndos subscription expires TOMORROW",
    body: "Hi {{ownerName}}, this is your <strong>final warning</strong>. Your inndos subscription expires <strong>tomorrow ({{expiryDate}})</strong>. After expiry your listings will be hidden and you will stop receiving link-up requests.",
    ctaLabel: "Renew My Subscription",
    variables: SUBSCRIPTION_VARS,
  },

  // ── SUBSCRIPTION — Expired ──────────────────────────────────────────────────
  {
    key: "subscription.expired.sms",
    category: "subscription", channel: "sms",
    label: "Subscription Expired (SMS)",
    body: "⚠️ inndos: Dear {{ownerName}}, your subscription has EXPIRED. Your {{activeListings}} listing(s) are now hidden from seekers. Reactivate immediately: {{dashboardUrl}}",
    variables: SUBSCRIPTION_VARS,
  },
  {
    key: "subscription.expired.bell",
    category: "subscription", channel: "bell",
    label: "Subscription Expired (Bell)",
    body: "⚠️ Your subscription has expired. Your {{activeListings}} listing(s) are now hidden. Reactivate from your dashboard to go live again.",
    variables: SUBSCRIPTION_VARS,
  },
  {
    key: "subscription.expired.email",
    category: "subscription", channel: "email",
    label: "Subscription Expired (Email)",
    subject: "⚠️ Your inndos subscription has expired – Reactivate now",
    body: "Hi {{ownerName}}, your inndos <strong>{{planName}}</strong> subscription expired on <strong>{{expiryDate}}</strong>. Your {{activeListings}} listing(s) are now hidden from search and you are no longer receiving link-up requests.",
    ctaLabel: "Reactivate My Subscription",
    variables: SUBSCRIPTION_VARS,
  },

  // ── SUBSCRIPTION — Renewal Confirmation ────────────────────────────────────
  {
    key: "subscription.renewed.email",
    category: "subscription", channel: "email",
    label: "Subscription Renewal Confirmation (Email)",
    subject: "✅ Subscription renewed – Your inndos {{planName}} plan is active",
    body: "Your inndos <strong>{{planName}}</strong> subscription has been renewed successfully. Your listings are live and visible to seekers across Nairobi and beyond.",
    ctaLabel: "Go to My Dashboard",
    variables: [
      { name: "ownerName",      description: "Property owner's full name" },
      { name: "planName",       description: "Plan name" },
      { name: "amount",         description: "Amount paid in KES" },
      { name: "newExpiryDate",  description: "New expiry/renewal date" },
      { name: "billingCycle",   description: "Billing period (monthly/yearly)" },
      { name: "dashboardUrl",   description: "Link to the dashboard" },
    ],
  },

  // ── BOOKING — New Link-Up (Owner) ──────────────────────────────────────────
  {
    key: "booking.new.owner.bell",
    category: "booking", channel: "bell",
    label: "New Link-Up — Owner Notification (Bell)",
    body: "{{guestName}} sent a link-up request for \"{{propertyTitle}}\". Tap to review the enquiry.",
    variables: BOOKING_VARS,
  },
  {
    key: "booking.new.owner.sms",
    category: "booking", channel: "sms",
    label: "New Link-Up — Owner Notification (SMS)",
    body: "🔔 inndos: {{guestName}} sent a link-up request for \"{{propertyTitle}}\". Log in to review and contact them: {{dashboardUrl}}",
    variables: BOOKING_VARS,
  },
  {
    key: "booking.new.owner.email",
    category: "booking", channel: "email",
    label: "New Link-Up — Owner Notification (Email)",
    subject: "New link-up request for \"{{propertyTitle}}\"",
    body: "Hi {{ownerName}}, <strong>{{guestName}}</strong> has submitted a link-up enquiry for <strong>{{propertyTitle}}</strong>. Log in to your dashboard to review the request and discuss availability.",
    ctaLabel: "Review Request",
    variables: BOOKING_VARS,
  },

  // ── BOOKING — New Link-Up (Admin) ──────────────────────────────────────────
  {
    key: "booking.new.admin.bell",
    category: "booking", channel: "bell",
    label: "New Link-Up — Admin Notification (Bell)",
    body: "New link-up enquiry: {{guestName}} requested \"{{propertyTitle}}\".",
    variables: BOOKING_VARS,
  },
  {
    key: "booking.new.admin.sms",
    category: "booking", channel: "sms",
    label: "New Link-Up — Admin Notification (SMS)",
    body: "📋 inndos Admin: New link-up enquiry — {{guestName}} requested \"{{propertyTitle}}\".",
    variables: BOOKING_VARS,
  },

  // ── BOOKING — Confirmed (Guest) ─────────────────────────────────────────────
  {
    key: "booking.confirmed.guest.bell",
    category: "booking", channel: "bell",
    label: "Booking Confirmed — Guest Notification (Bell)",
    body: "🎉 Your link-up for \"{{propertyTitle}}\" has been confirmed! Check your dashboard for details.",
    variables: BOOKING_VARS,
  },
  {
    key: "booking.confirmed.guest.sms",
    category: "booking", channel: "sms",
    label: "Booking Confirmed — Guest Notification (SMS)",
    body: "🎉 inndos: Great news! Your link-up for \"{{propertyTitle}}\" has been confirmed by the owner. View details: {{dashboardUrl}}",
    variables: BOOKING_VARS,
  },
  {
    key: "booking.confirmed.guest.email",
    category: "booking", channel: "email",
    label: "Booking Confirmed — Guest Notification (Email)",
    subject: "🎉 Your link-up for \"{{propertyTitle}}\" is confirmed!",
    body: "Hi {{guestName}}, great news! Your link-up request for <strong>{{propertyTitle}}</strong> has been <strong>confirmed</strong> by the owner.",
    ctaLabel: "View My Booking",
    variables: BOOKING_VARS,
  },

  // ── BOOKING — Declined (Guest) ──────────────────────────────────────────────
  {
    key: "booking.declined.guest.bell",
    category: "booking", channel: "bell",
    label: "Booking Declined — Guest Notification (Bell)",
    body: "Your link-up request for \"{{propertyTitle}}\" was not approved this time. Browse other available properties.",
    variables: BOOKING_VARS,
  },
  {
    key: "booking.declined.guest.sms",
    category: "booking", channel: "sms",
    label: "Booking Declined — Guest Notification (SMS)",
    body: "inndos: Your link-up request for \"{{propertyTitle}}\" was not approved. Don't worry — browse more options: {{dashboardUrl}}",
    variables: BOOKING_VARS,
  },
  {
    key: "booking.declined.guest.email",
    category: "booking", channel: "email",
    label: "Booking Declined — Guest Notification (Email)",
    subject: "Update on your link-up request for \"{{propertyTitle}}\"",
    body: "Hi {{guestName}}, we're sorry — your link-up request for <strong>{{propertyTitle}}</strong> was not approved this time. Don't worry, there are many great properties on inndos.",
    ctaLabel: "Browse Properties",
    variables: BOOKING_VARS,
  },

  // ── BOOKING — Cancelled by Guest (Owner) ───────────────────────────────────
  {
    key: "booking.cancelled.owner.bell",
    category: "booking", channel: "bell",
    label: "Booking Cancelled by Guest — Owner Notification (Bell)",
    body: "{{guestName}} cancelled their link-up request for \"{{propertyTitle}}\".",
    variables: BOOKING_VARS,
  },
  {
    key: "booking.cancelled.owner.sms",
    category: "booking", channel: "sms",
    label: "Booking Cancelled by Guest — Owner Notification (SMS)",
    body: "inndos: {{guestName}} cancelled their link-up request for \"{{propertyTitle}}\". Your listing remains available.",
    variables: BOOKING_VARS,
  },

  // ── BOOKING — Cancelled by Guest (Admin) ───────────────────────────────────
  {
    key: "booking.cancelled.admin.bell",
    category: "booking", channel: "bell",
    label: "Booking Cancelled by Guest — Admin Notification (Bell)",
    body: "{{guestName}} cancelled their link-up request for \"{{propertyTitle}}\".",
    variables: BOOKING_VARS,
  },
  {
    key: "booking.cancelled.admin.sms",
    category: "booking", channel: "sms",
    label: "Booking Cancelled by Guest — Admin Notification (SMS)",
    body: "📋 inndos Admin: {{guestName}} cancelled their link-up request for \"{{propertyTitle}}\".",
    variables: BOOKING_VARS,
  },

  // ── BOOKING — Review Prompt (Guest) ────────────────────────────────────────
  {
    key: "booking.review_prompt.bell",
    category: "booking", channel: "bell",
    label: "Post-Stay Review Prompt (Bell)",
    body: "How was your stay at \"{{propertyTitle}}\"? Share your experience — your review helps other seekers.",
    variables: BOOKING_VARS,
  },
  {
    key: "booking.review_prompt.sms",
    category: "booking", channel: "sms",
    label: "Post-Stay Review Prompt (SMS)",
    body: "inndos: How was your stay at \"{{propertyTitle}}\"? Leave a quick review and help other seekers: {{dashboardUrl}}",
    variables: BOOKING_VARS,
  },

  // ── LISTING — Approved ──────────────────────────────────────────────────────
  {
    key: "listing.approved.owner.email",
    category: "listing", channel: "email",
    label: "Listing Approved — Owner Notification (Email)",
    subject: "✅ Your listing \"{{propertyTitle}}\" is live on inndos",
    body: "Hi {{ownerName}}, great news! Your listing <strong>\"{{propertyTitle}}\"</strong> has been reviewed and approved by our team. It is now live and visible to thousands of property seekers on inndos.",
    ctaLabel: "View My Listing",
    variables: LISTING_VARS,
  },

  // ── LISTING — Rejected ──────────────────────────────────────────────────────
  {
    key: "listing.rejected.owner.email",
    category: "listing", channel: "email",
    label: "Listing Rejected — Owner Notification (Email)",
    subject: "Your listing \"{{propertyTitle}}\" requires changes",
    body: "Hi {{ownerName}}, we have reviewed your listing <strong>\"{{propertyTitle}}\"</strong> and it needs a few changes before it can go live. Reason: <em>{{rejectionReason}}</em>. Please update your listing and resubmit.",
    ctaLabel: "Edit My Listing",
    variables: LISTING_VARS,
  },

  // ── AUTH — New User Signup (Admin) ─────────────────────────────────────────
  {
    key: "auth.signup.admin.bell",
    category: "auth", channel: "bell",
    label: "New User Registration — Admin Notification (Bell)",
    body: "New user registered: {{userName}} ({{userEmail}}) joined as {{userRole}}.",
    variables: AUTH_VARS,
  },
  {
    key: "auth.signup.admin.sms",
    category: "auth", channel: "sms",
    label: "New User Registration — Admin Notification (SMS)",
    body: "📋 inndos Admin: New user registered — {{userName}} ({{userEmail}}) joined as {{userRole}}.",
    variables: AUTH_VARS,
  },

  // ── TRANSACTION — Confirmation Prompt ──────────────────────────────────────
  {
    key: "transaction.confirm_prompt.bell",
    category: "transaction", channel: "bell",
    label: "Transaction Confirmation Prompt (Bell)",
    body: "Please confirm your transaction for \"{{propertyTitle}}\" via your dashboard.",
    variables: [
      { name: "propertyTitle", description: "Property title" },
      { name: "transactionType", description: "rental or sale" },
      { name: "dashboardUrl",  description: "Link to the dashboard" },
    ],
  },
  {
    key: "transaction.confirm_prompt.sms",
    category: "transaction", channel: "sms",
    label: "Transaction Confirmation Prompt (SMS)",
    body: "inndos: Please confirm your {{transactionType}} for \"{{propertyTitle}}\" via your dashboard: {{dashboardUrl}}",
    variables: [
      { name: "propertyTitle",   description: "Property title" },
      { name: "transactionType", description: "rental or sale" },
      { name: "dashboardUrl",    description: "Link to the dashboard" },
    ],
  },
];

export async function seedNotificationTemplates(): Promise<void> {
  let seeded = 0;
  let skipped = 0;

  for (const tmpl of TEMPLATE_SEEDS) {
    try {
      const variablesJson = JSON.stringify(tmpl.variables);
      await db.execute(sql`
        INSERT INTO notification_templates
          (key, category, channel, label, subject, body, cta_label,
           default_subject, default_body, default_cta_label, variables, is_active)
        VALUES
          (${tmpl.key}, ${tmpl.category}, ${tmpl.channel}, ${tmpl.label},
           ${tmpl.subject ?? null}, ${tmpl.body}, ${tmpl.ctaLabel ?? null},
           ${tmpl.subject ?? null}, ${tmpl.body}, ${tmpl.ctaLabel ?? null},
           ${variablesJson}::jsonb, true)
        ON CONFLICT (key) DO UPDATE SET
          default_subject   = EXCLUDED.default_subject,
          default_body      = EXCLUDED.default_body,
          default_cta_label = EXCLUDED.default_cta_label,
          label             = EXCLUDED.label,
          variables         = EXCLUDED.variables
      `);
      seeded++;
    } catch (err) {
      logger.warn({ err, key: tmpl.key }, "Failed to seed template");
      skipped++;
    }
  }

  logger.info({ seeded, skipped }, "Notification templates seeded");
}

/**
 * One-time-safe hygiene for templates and bell messages created before the
 * canonical domain rule. Runtime rendering also applies this rewrite, so a
 * newly edited template cannot leak a preview URL between server restarts.
 */
export async function canonicalizeStoredNotificationLinks(): Promise<void> {
  let templatesUpdated = 0;
  let notificationsUpdated = 0;

  try {
    const templateResult = await db.execute(sql`
      SELECT id, subject, body, default_subject, default_body
      FROM notification_templates
    `);

    for (const row of templateResult.rows as Record<string, unknown>[]) {
      const subject = typeof row.subject === "string" ? rewritePreviewUrls(row.subject) : null;
      const body = typeof row.body === "string" ? rewritePreviewUrls(row.body) : "";
      const defaultSubject = typeof row.default_subject === "string"
        ? rewritePreviewUrls(row.default_subject)
        : null;
      const defaultBody = typeof row.default_body === "string"
        ? rewritePreviewUrls(row.default_body)
        : "";

      if (
        subject !== row.subject ||
        body !== row.body ||
        defaultSubject !== row.default_subject ||
        defaultBody !== row.default_body
      ) {
        await db.execute(sql`
          UPDATE notification_templates
          SET subject = ${subject},
              body = ${body},
              default_subject = ${defaultSubject},
              default_body = ${defaultBody}
          WHERE id = ${String(row.id)}
        `);
        templatesUpdated++;
      }
    }
  } catch (err) {
    logger.warn({ err }, "Could not canonicalize notification template links");
  }

  try {
    const notificationResult = await db.execute(sql`
      SELECT id, message FROM notifications
    `);

    for (const row of notificationResult.rows as Record<string, unknown>[]) {
      if (typeof row.message !== "string") continue;
      const message = rewritePreviewUrls(row.message);
      if (message !== row.message) {
        await db.execute(sql`
          UPDATE notifications SET message = ${message} WHERE id = ${String(row.id)}
        `);
        notificationsUpdated++;
      }
    }
  } catch (err) {
    logger.warn({ err }, "Could not canonicalize saved bell notification links");
  }

  if (templatesUpdated || notificationsUpdated) {
    logger.info({ templatesUpdated, notificationsUpdated }, "Canonicalized saved notification links");
  }
}
