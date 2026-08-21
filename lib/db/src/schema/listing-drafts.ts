import { sql } from "drizzle-orm";
import { jsonb, pgTable, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { users } from "./schema";

export const listingDrafts = pgTable(
  "listing_drafts",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    data: jsonb("data").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("listing_drafts_user_id_unique").on(table.userId)],
);

export const insertListingDraftSchema = createInsertSchema(listingDrafts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertListingDraft = z.infer<typeof insertListingDraftSchema>;
export type ListingDraft = typeof listingDrafts.$inferSelect;