import { db, settings } from "@workspace/db";

const updates = [
  { key: "sms_provider",   value: "airtouch" },
  { key: "sms_sender_id",  value: "inndos" },
  { key: "sms_username",   value: "webexpert" },
  { key: "sms_password",   value: "c7af15dd395dca7c9b6450bea438629c" },
];

async function run() {
  for (const u of updates) {
    await db
      .insert(settings)
      .values({ key: u.key, value: u.value, updatedAt: new Date() })
      .onConflictDoUpdate({ target: settings.key, set: { value: u.value, updatedAt: new Date() } });
    console.log(`✓ Set ${u.key}`);
  }
  console.log("SMS settings saved.");
  process.exit(0);
}

run().catch((e) => { console.error(e); process.exit(1); });
