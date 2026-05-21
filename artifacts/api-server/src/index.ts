import app from "./app";
import { logger } from "./lib/logger";
import { db } from "@workspace/db";
import { subscriptionPlans } from "@workspace/db";
import { sql } from "drizzle-orm";

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
  const defaults = [
    { name: "standard", displayName: "Standard", pricePerMonth: 0, listingLimit: 3, features: ["Up to 3 listings", "Basic support", "Standard visibility"] },
    { name: "silver", displayName: "Silver", pricePerMonth: 2000, listingLimit: 10, features: ["Up to 10 listings", "Priority support", "Enhanced visibility", "Analytics dashboard"] },
    { name: "gold", displayName: "Gold", pricePerMonth: 5000, listingLimit: 2147483647, features: ["Unlimited listings", "Dedicated support", "Maximum visibility", "Advanced analytics", "Featured placement"] },
  ];
  for (const plan of defaults) {
    await db.execute(
      sql`INSERT INTO subscription_plans (name, display_name, price_per_month, listing_limit, features, is_active, updated_at)
          VALUES (${plan.name}, ${plan.displayName}, ${plan.pricePerMonth}, ${plan.listingLimit}, ${sql.raw(`ARRAY[${plan.features.map(f => `'${f.replace(/'/g, "''")}'`).join(",")}]::text[]`)}, true, now())
          ON CONFLICT (name) DO NOTHING`
    );
  }
  logger.info("Default subscription plans seeded");
}

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
  try {
    await seedDefaultPlans();
  } catch (e) {
    logger.error({ err: e }, "Failed to seed default subscription plans");
  }
});
