import app from "./app";
import { logger } from "./lib/logger";
import { db } from "@workspace/db";
import { subscriptionPlans } from "@workspace/db";
import { sql } from "drizzle-orm";
import { startSubscriptionReminderJob } from "./lib/reminderJob";

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
      features: [
        "Up to 3 listings",
        "5 photos per listing",
        "No video / virtual tour",
        "0 featured listings per month",
        "No search boost",
        "No phone support",
      ],
    },
    {
      name: "basic",
      displayName: "Basic",
      pricePerMonth: 199,
      listingLimit: 10,
      features: [
        "Up to 10 listings",
        "15 photos per listing",
        "No video / virtual tour",
        "1 featured listing per month",
        "Low search boost",
        "No phone support",
      ],
    },
    {
      name: "pro",
      displayName: "Pro",
      pricePerMonth: 249,
      listingLimit: 50,
      features: [
        "Up to 50 listings",
        "30 photos per listing",
        "1 video / virtual tour per listing",
        "3 featured listings per month",
        "High search boost",
        "Phone support",
        "Export leads",
      ],
    },
    {
      name: "enterprise",
      displayName: "Enterprise",
      pricePerMonth: 0,
      listingLimit: 2147483647,
      features: [
        "Unlimited listings",
        "Unlimited photos per listing",
        "5 videos / virtual tours per listing",
        "Negotiable featured listings",
        "Highest search boost",
        "24/7 phone support",
        "Dedicated account manager",
        "API access",
        "Export leads",
      ],
    },
  ];

  for (const plan of defaults) {
    await db.execute(
      sql`INSERT INTO subscription_plans (name, display_name, price_per_month, listing_limit, features, is_active, updated_at)
          VALUES (${plan.name}, ${plan.displayName}, ${plan.pricePerMonth}, ${plan.listingLimit}, ${sql.raw(`ARRAY[${plan.features.map(f => `'${f.replace(/'/g, "''")}'`).join(",")}]::text[]`)}, true, now())
          ON CONFLICT (name) DO UPDATE SET
            display_name = EXCLUDED.display_name,
            price_per_month = EXCLUDED.price_per_month,
            listing_limit = EXCLUDED.listing_limit,
            features = EXCLUDED.features,
            updated_at = now()`
    );
  }
  logger.info("Default subscription plans seeded (Free/Basic/Pro/Enterprise)");
}

async function runMigrations() {
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT`);
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP`);

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
    startSubscriptionReminderJob();
  } catch (e) {
    logger.error({ err: e }, "Failed to start subscription reminder job");
  }
});
