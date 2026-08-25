/**
 * Notification Template Engine
 * Fetches editable templates from the notification_templates table and
 * interpolates {{variable}} placeholders before sending.
 */

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";
import { rewritePreviewUrls } from "./appUrl";

type Vars = Record<string, string | number>;

/** Replace {{key}} placeholders with values from vars. */
export function interpolate(template: string, vars: Vars): string {
  const interpolated = template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const val = vars[key];
    return val != null ? String(val) : `{{${key}}}`;
  });
  return rewritePreviewUrls(interpolated);
}

/**
 * Resolve a single SMS or bell template from DB.
 * Falls back to `fallback` string (with interpolation) if DB lookup fails or
 * returns nothing.
 */
export async function resolveTemplate(
  key: string,
  vars: Vars,
  fallback?: string
): Promise<string> {
  try {
    const result = await db.execute(
      sql`SELECT body FROM notification_templates WHERE key = ${key} AND is_active = true LIMIT 1`
    );
    const row = result.rows?.[0] as Record<string, unknown> | undefined;
    if (typeof row?.body === "string" && row.body.trim()) {
      return interpolate(row.body, vars);
    }
  } catch (err) {
    logger.warn({ err, key }, "Template DB fetch failed — using fallback");
  }
  if (fallback) return interpolate(fallback, vars);
  return `[Template '${key}' not found]`;
}

/**
 * Resolve multiple templates in a single DB round-trip.
 * Returns a map of key → resolved string.
 * Keys missing from DB fall back to the provided fallbacks map.
 */
export async function resolveTemplates(
  keys: string[],
  vars: Vars,
  fallbacks: Record<string, string> = {}
): Promise<Record<string, string>> {
  const resolved: Record<string, string> = {};
  // Initialise with fallbacks
  for (const k of keys) {
    resolved[k] = fallbacks[k] ? interpolate(fallbacks[k], vars) : `[Template '${k}' not found]`;
  }
  try {
    const result = await db.execute(
      sql`SELECT key, body FROM notification_templates WHERE key = ANY(${keys}) AND is_active = true`
    );
    for (const row of result.rows as Record<string, unknown>[]) {
      if (typeof row.key === "string" && typeof row.body === "string" && row.body.trim()) {
        resolved[row.key] = interpolate(row.body, vars);
      }
    }
  } catch (err) {
    logger.warn({ err }, "Batch template DB fetch failed — using fallbacks");
  }
  return resolved;
}

export interface EmailTemplateResult {
  subject: string;
  bodyText: string;
  ctaLabel: string;
}

/**
 * Resolve an email template from DB (subject + body + cta_label).
 * Falls back to provided defaults if DB lookup fails or returns nothing.
 */
export async function resolveEmailTemplate(
  key: string,
  vars: Vars,
  defaults: Partial<EmailTemplateResult> = {}
): Promise<EmailTemplateResult> {
  try {
    const result = await db.execute(
      sql`SELECT subject, body, cta_label FROM notification_templates WHERE key = ${key} AND is_active = true LIMIT 1`
    );
    const row = result.rows?.[0] as Record<string, unknown> | undefined;
    if (row) {
      return {
        subject:  interpolate((row.subject  as string) || defaults.subject  || "", vars),
        bodyText: interpolate((row.body     as string) || defaults.bodyText || "", vars),
        ctaLabel: (row.cta_label as string) || defaults.ctaLabel || "Go to Dashboard",
      };
    }
  } catch (err) {
    logger.warn({ err, key }, "Email template DB fetch failed — using defaults");
  }
  return {
    subject:  interpolate(defaults.subject  || "", vars),
    bodyText: interpolate(defaults.bodyText || "", vars),
    ctaLabel: defaults.ctaLabel || "Go to Dashboard",
  };
}
