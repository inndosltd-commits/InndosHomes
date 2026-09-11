import { sql } from "drizzle-orm";
import { jsonb, timestamp, varchar, text } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";

export const cmsPages = pgTable("cms_pages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  label: text("label").notNull(),
  draft: jsonb("draft").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  published: jsonb("published").$type<Record<string, unknown>>(),
  publishedBackup: jsonb("published_backup").$type<Record<string, unknown>>(),
  updatedBy: varchar("updated_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  publishedBackupAt: timestamp("published_backup_at", { withTimezone: true }),
  previewedBy: varchar("previewed_by"),
  previewedDraftHash: varchar("previewed_draft_hash", { length: 128 }),
  previewedAt: timestamp("previewed_at", { withTimezone: true }),
});

export type CmsPage = typeof cmsPages.$inferSelect;
export type InsertCmsPage = typeof cmsPages.$inferInsert;