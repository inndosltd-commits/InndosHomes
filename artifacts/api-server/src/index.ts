import app from "./app";
import { logger } from "./lib/logger";
import { db } from "@workspace/db";
import { subscriptionPlans } from "@workspace/db";
import { sql } from "drizzle-orm";
import { startSubscriptionReminderJob } from "./lib/reminderJob";
import { canonicalizeStoredNotificationLinks, seedNotificationTemplates } from "./lib/notificationTemplateSeeds";

const rawPort = process.env["PORT"];
if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

if (!process.env["JWT_SECRET"]) {
  throw new Error(
    "JWT_SECRET environment variable is required. " +
    "Set a strong random secret before starting the server."
  );
}

async function seedDefaultPlans() {
  // Migrate old plan names in subscriptions and payments tables
  await db.execute(sql`UPDATE subscriptions SET plan = 'free' WHERE plan = 'standard'`);
  await db.execute(sql`UPDATE subscriptions SET plan = 'basic' WHERE plan = 'silver'`);
  await db.execute(sql`UPDATE subscriptions SET plan = 'pro' WHERE plan = 'gold'`);
  await db.execute(sql`UPDATE payments SET plan = 'basic' WHERE plan = 'silver'`);
  await db.execute(sql`UPDATE payments SET plan = 'pro' WHERE plan = 'gold'`);

  // Remove old plan records
  await db.execute(sql`DELETE FROM subscription_plans WHERE name IN ('standard', 'silver', 'gold')`);

  const defaults = [
    {
      name: "free",
      displayName: "Free",
      pricePerMonth: 0,
      listingLimit: 3,
      imageLimit: 5,
      videoLimit: 0,
      featuredLimit: 0,
      discoveryEnabled: false,
      searchBoost: 0,
      phoneSupport: false,
      features: [
        "Up to 3 listings",
        "5 photos per listing",
        "No video / virtual tour",
        "0 featured listings per month",
        "No brand-profile search",
        "No dedicated phone support",
      ],
    },
    {
      name: "basic",
      displayName: "Basic",
      pricePerMonth: 399,
      listingLimit: 7,
      imageLimit: 10,
      videoLimit: 0,
      featuredLimit: 1,
      discoveryEnabled: true,
      searchBoost: 1,
      phoneSupport: false,
      features: [
        "Up to 7 listings",
        "10 photos per listing",
        "No video / virtual tour",
        "1 featured listing per month",
        "Brand-profile search",
        "No dedicated phone support",
      ],
    },
    {
      name: "pro",
      displayName: "Pro",
      pricePerMonth: 599,
      listingLimit: 15,
      imageLimit: 20,
      videoLimit: 1,
      featuredLimit: 3,
      discoveryEnabled: true,
      searchBoost: 0,
      phoneSupport: false,
      features: [
        "Up to 15 listings",
        "20 photos per listing",
        "1 video / virtual tour per listing",
        "3 featured listings per month",
        "Brand-profile search",
      ],
    },
    {
      name: "enterprise",
      displayName: "Enterprise",
      pricePerMonth: 0,
      listingLimit: 2147483647,
      imageLimit: 2147483647,
      videoLimit: 5,
      featuredLimit: 0,
      discoveryEnabled: true,
      searchBoost: 0,
      phoneSupport: true,
      features: [
        "Unlimited listings",
        "Unlimited photos per listing",
        "5 videos / virtual tours per listing",
        "Negotiated featured allocation",
        "Brand-profile search",
        "24/7 phone support",
        "Dedicated account manager",
      ],
    },
  ];

  for (const plan of defaults) {
    await db.execute(
      sql`INSERT INTO subscription_plans (name, display_name, price_per_month, listing_limit, image_limit, video_limit, featured_limit, discovery_enabled, search_boost, phone_support, features, is_active, updated_at)
          VALUES (${plan.name}, ${plan.displayName}, ${plan.pricePerMonth}, ${plan.listingLimit}, ${plan.imageLimit}, ${plan.videoLimit}, ${plan.featuredLimit}, ${plan.discoveryEnabled}, ${plan.searchBoost}, ${plan.phoneSupport}, ${sql.raw(`ARRAY[${plan.features.map(f => `'${f.replace(/'/g, "''")}'`).join(",")}]::text[]`)}, true, now())
           ON CONFLICT (name) DO NOTHING`
    );
  }
  logger.info("Default subscription plans seeded (Free/Basic/Pro/Enterprise)");
}

async function runMigrations() {
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT`);
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP`);
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS business_name TEXT`);
  await db.execute(sql`
    ALTER TABLE properties
    ADD COLUMN IF NOT EXISTS details JSONB NOT NULL DEFAULT '{}'::jsonb
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS listing_drafts (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      updated_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS image_limit INTEGER NOT NULL DEFAULT 5`);
  await db.execute(sql`ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS video_limit INTEGER NOT NULL DEFAULT 0`);
  await db.execute(sql`ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS featured_limit INTEGER NOT NULL DEFAULT 0`);
  await db.execute(sql`ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS discovery_enabled BOOLEAN NOT NULL DEFAULT FALSE`);
  await db.execute(sql`ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS search_boost INTEGER NOT NULL DEFAULT 0`);
  await db.execute(sql`ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS phone_support BOOLEAN NOT NULL DEFAULT FALSE`);
  await db.execute(sql`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS featured_limit_override INTEGER`);
  await db.execute(sql`ALTER TABLE properties ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE`);
  await db.execute(sql`ALTER TABLE properties ADD COLUMN IF NOT EXISTS featured_at TIMESTAMP`);
  await db.execute(sql`ALTER TABLE properties ADD COLUMN IF NOT EXISTS featured_until TIMESTAMP`);
  await db.execute(sql`ALTER TABLE properties ADD COLUMN IF NOT EXISTS video_posters TEXT[] NOT NULL DEFAULT '{}'::text[]`);
  // Cross-replica resource control for expensive property-video ffmpeg work.
  // Leases expire after a crashed worker; event history is a durable rolling
  // admission budget and is cleaned opportunistically by the route.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS video_processing_leases (
      user_id VARCHAR PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      token UUID NOT NULL,
      lease_until TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS video_processing_events (
      id BIGSERIAL PRIMARY KEY,
      user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS video_processing_events_user_created_at_idx
    ON video_processing_events (user_id, created_at)
  `);
  await db.execute(sql`ALTER TABLE properties ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS featured_listing_uses (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      property_id VARCHAR NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      month_key TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      revoked_at TIMESTAMP
    )
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS featured_listing_uses_user_property_month_unique
    ON featured_listing_uses(user_id, property_id, month_key)
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS listing_drafts_user_id_unique
    ON listing_drafts(user_id)
  `);
  // Property blocks historically stored an inclusive end date. Mark and
  // convert each existing row once so all availability ranges use [start, end).
  await db.execute(sql`
    ALTER TABLE property_blocks
    ADD COLUMN IF NOT EXISTS end_is_exclusive BOOLEAN NOT NULL DEFAULT FALSE
  `);
  await db.execute(sql`
    UPDATE property_blocks
    SET end_date = (end_date::date + 1)::text,
        end_is_exclusive = TRUE
    WHERE end_is_exclusive = FALSE
  `);
  await db.execute(sql`
    ALTER TABLE property_blocks
    ALTER COLUMN end_is_exclusive SET DEFAULT TRUE
  `);

  // Reviews and review replies tables
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS reviews (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      property_id VARCHAR NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      reviewer_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      booking_id VARCHAR REFERENCES bookings(id) ON DELETE SET NULL,
      rating INTEGER NOT NULL,
      comment TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS reviews_booking_unique ON reviews(booking_id) WHERE booking_id IS NOT NULL`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS review_replies (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      review_id VARCHAR NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
      owner_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reply TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS review_replies_review_unique ON review_replies(review_id)`);

  // Property transaction confirmation table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS property_transactions (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      booking_id VARCHAR REFERENCES bookings(id),
      property_id VARCHAR NOT NULL REFERENCES properties(id),
      owner_id VARCHAR NOT NULL REFERENCES users(id),
      tenant_id VARCHAR NOT NULL REFERENCES users(id),
      transaction_type TEXT NOT NULL DEFAULT 'rental',
      property_title TEXT NOT NULL,
      property_address TEXT,
      transaction_value INTEGER,
      owner_confirmation TEXT NOT NULL DEFAULT 'pending',
      tenant_confirmation TEXT NOT NULL DEFAULT 'pending',
      status TEXT NOT NULL DEFAULT 'pending_confirmation',
      owner_confirmed_at TIMESTAMP,
      tenant_confirmed_at TIMESTAMP,
      reminder_1_sent_at TIMESTAMP,
      reminder_3_sent_at TIMESTAMP,
      admin_resolved_by VARCHAR,
      admin_resolved_at TIMESTAMP,
      admin_notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `);

  // Favorites table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS favorites (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, property_id)
    )
  `);

  // Notification templates table (admin-editable content)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS notification_templates (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      key TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      channel TEXT NOT NULL,
      label TEXT NOT NULL,
      subject TEXT,
      body TEXT NOT NULL DEFAULT '',
      cta_label TEXT,
      default_subject TEXT,
      default_body TEXT NOT NULL DEFAULT '',
      default_cta_label TEXT,
      variables JSONB NOT NULL DEFAULT '[]',
      is_active BOOLEAN NOT NULL DEFAULT true,
      updated_by TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Marketing / Referral Module tables
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS marketers (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR NOT NULL UNIQUE REFERENCES users(id),
      marketer_code TEXT NOT NULL UNIQUE,
      referral_code TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      updated_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS referrals (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      marketer_id VARCHAR NOT NULL REFERENCES marketers(id),
      referred_user_id VARCHAR NOT NULL UNIQUE REFERENCES users(id),
      referral_code TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS referral_visits (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      marketer_id VARCHAR NOT NULL REFERENCES marketers(id),
      referral_code TEXT NOT NULL,
      session_id TEXT,
      ip_address TEXT,
      user_agent TEXT,
      landing_page TEXT,
      visited_at TIMESTAMP NOT NULL DEFAULT now(),
      converted BOOLEAN NOT NULL DEFAULT false,
      converted_at TIMESTAMP
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS marketing_audit_log (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      admin_id VARCHAR REFERENCES users(id),
      action TEXT NOT NULL,
      target_marketer_id VARCHAR REFERENCES marketers(id),
      target_user_id VARCHAR REFERENCES users(id),
      details TEXT,
      ip_address TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS cms_pages (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      slug VARCHAR(120) NOT NULL UNIQUE,
      label TEXT NOT NULL,
      draft JSONB NOT NULL DEFAULT '{}'::jsonb,
      published JSONB,
      published_backup JSONB,
      updated_by VARCHAR REFERENCES users(id),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      published_at TIMESTAMPTZ,
      published_backup_at TIMESTAMPTZ,
      previewed_by VARCHAR,
      previewed_draft_hash VARCHAR(128),
      previewed_at TIMESTAMPTZ
    )
  `);
  await db.execute(sql`ALTER TABLE cms_pages ADD COLUMN IF NOT EXISTS previewed_by VARCHAR`);
  await db.execute(sql`ALTER TABLE cms_pages ADD COLUMN IF NOT EXISTS previewed_draft_hash VARCHAR(128)`);
  await db.execute(sql`ALTER TABLE cms_pages ADD COLUMN IF NOT EXISTS previewed_at TIMESTAMPTZ`);
  await db.execute(sql`ALTER TABLE cms_pages ADD COLUMN IF NOT EXISTS published_backup JSONB`);
  await db.execute(sql`ALTER TABLE cms_pages ADD COLUMN IF NOT EXISTS published_backup_at TIMESTAMPTZ`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS cms_pages_slug_idx ON cms_pages(slug)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_referrals_marketer_id ON referrals(marketer_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_referrals_created_at ON referrals(created_at)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_referral_visits_marketer_id ON referral_visits(marketer_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_marketers_referral_code ON marketers(referral_code)`);

  logger.info("Schema migrations applied");
}

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
  try {
    await runMigrations();
  } catch (e) {
    logger.error({ err: e }, "Failed to run migrations");
  }
  try {
    await seedDefaultPlans();
  } catch (e) {
    logger.error({ err: e }, "Failed to seed default subscription plans");
  }
  try {
    await seedNotificationTemplates();
    await canonicalizeStoredNotificationLinks();
  } catch (e) {
    logger.error({ err: e }, "Failed to seed notification templates");
  }
  try {
    startSubscriptionReminderJob();
  } catch (e) {
    logger.error({ err: e }, "Failed to start subscription reminder job");
  }
});
