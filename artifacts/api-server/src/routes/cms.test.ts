import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import test, { after, before, describe } from "node:test";
import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import type { CmsDocument, CmsGlobalDocument } from "./cms.ts";

process.env.JWT_SECRET ??= "cms-regression-test-secret";

const { default: app } = await import("../app");
const { db, cmsPages, pool, users } = await import("@workspace/db");
const { signToken } = await import("./auth");

const slug = "/contact";
const dashboardSlug = "/dashboard";
const testEmailPrefix = `cms-regression-${process.pid}-`;
const developerId = randomUUID();
const adminId = randomUUID();
const developerEmail = `${testEmailPrefix}developer@example.test`;
const adminEmail = `${testEmailPrefix}admin@example.test`;

const document: CmsDocument = {
  pageTitle: "Regression test page",
  metaDescription: "Only published CMS content is public.",
  backgroundColor: "#ffffff",
  textColor: "#111111",
  accentColor: "#111111",
  sections: [{
    id: "regression-content",
    type: "content",
    label: "Content",
    eyebrow: "",
    title: "Published CMS content",
    body: "This content should only appear after publishing.",
    buttonText: "",
    buttonHref: "",
    backgroundColor: "#ffffff",
    textColor: "#111111",
    accentColor: "#111111",
    items: [],
    visible: true,
  }],
};

let server: Server;
let baseUrl: string;
let originalPage: typeof cmsPages.$inferSelect | undefined;
let originalDashboardPage: typeof cmsPages.$inferSelect | undefined;
let originalGlobalPage: typeof cmsPages.$inferSelect | undefined;

type RequestOptions = {
  method?: string;
  token?: string;
  body?: unknown;
};

async function request(path: string, options: RequestOptions = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  return {
    status: response.status,
    body: text ? JSON.parse(text) : null,
  };
}

before(async () => {
  await db.execute(sql`ALTER TABLE cms_pages ADD COLUMN IF NOT EXISTS previewed_by VARCHAR`);
  await db.execute(sql`ALTER TABLE cms_pages ADD COLUMN IF NOT EXISTS previewed_draft_hash VARCHAR(128)`);
  await db.execute(sql`ALTER TABLE cms_pages ADD COLUMN IF NOT EXISTS previewed_at TIMESTAMPTZ`);
  await db.execute(sql`ALTER TABLE cms_pages ADD COLUMN IF NOT EXISTS published_backup JSONB`);
  await db.execute(sql`ALTER TABLE cms_pages ADD COLUMN IF NOT EXISTS published_backup_at TIMESTAMPTZ`);
  [originalPage] = await db.select().from(cmsPages).where(eq(cmsPages.slug, slug)).limit(1);
  [originalDashboardPage] = await db.select().from(cmsPages).where(eq(cmsPages.slug, dashboardSlug)).limit(1);
  [originalGlobalPage] = await db.select().from(cmsPages).where(eq(cmsPages.slug, "__global__")).limit(1);
  await db.delete(cmsPages).where(eq(cmsPages.slug, slug));
  await db.delete(cmsPages).where(eq(cmsPages.slug, dashboardSlug));
  await db.delete(cmsPages).where(eq(cmsPages.slug, "__global__"));
  await db.insert(users).values([
    { id: developerId, name: "CMS Test Developer", email: developerEmail, password: "not-used", role: "developer" },
    { id: adminId, name: "CMS Test Admin", email: adminEmail, password: "not-used", role: "admin" },
  ]);

  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await db.delete(cmsPages).where(eq(cmsPages.slug, slug));
  await db.delete(cmsPages).where(eq(cmsPages.slug, dashboardSlug));
  await db.delete(cmsPages).where(eq(cmsPages.slug, "__global__"));
  if (originalPage) {
    await db.insert(cmsPages).values(originalPage);
  }
  if (originalDashboardPage) {
    await db.insert(cmsPages).values(originalDashboardPage);
  }
  if (originalGlobalPage) {
    await db.insert(cmsPages).values(originalGlobalPage);
  }
  await db.delete(users).where(and(eq(users.id, developerId), eq(users.email, developerEmail)));
  await db.delete(users).where(and(eq(users.id, adminId), eq(users.email, adminEmail)));
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await pool.end();
});

describe("CMS editor access control", () => {
  const editorRoutes = [
    { method: "GET", path: "/api/cms/pages" },
    { method: "GET", path: `/api/cms/pages${slug}` },
    { method: "GET", path: `/api/cms/preview${slug}` },
    { method: "POST", path: `/api/cms/preview${slug}`, body: { draft: document } },
    { method: "PUT", path: `/api/cms/pages${slug}`, body: { draft: document } },
    { method: "POST", path: `/api/cms/pages${slug}/publish` },
    { method: "POST", path: `/api/cms/pages${slug}/unpublish` },
    { method: "GET", path: "/api/cms/global" },
    { method: "POST", path: "/api/cms/global/preview", body: {} },
    { method: "PUT", path: "/api/cms/global", body: {} },
    { method: "POST", path: "/api/cms/global/publish" },
    { method: "POST", path: "/api/cms/global/unpublish" },
  ];

  test("rejects unauthenticated users from every CMS editor route", async () => {
    for (const route of editorRoutes) {
      const response = await request(route.path, route);
      assert.equal(response.status, 401, `${route.method} ${route.path}`);
    }
  });

  test("rejects admins because CMS access requires exactly the developer role", async () => {
    const token = signToken(adminId);
    for (const route of editorRoutes) {
      const response = await request(route.path, { ...route, token });
      assert.equal(response.status, 403, `${route.method} ${route.path}`);
    }
  });

  test("rejects restore access for unauthenticated users and non-developers", async () => {
    const route = { method: "POST", path: `/api/cms/pages${slug}/restore` };
    assert.equal((await request(route.path, route)).status, 401);
    assert.equal((await request(route.path, { ...route, token: signToken(adminId) })).status, 403);
  });
});

test("lets a developer edit and publish global Header and Footer settings", async () => {
  const token = signToken(developerId);
  const initial = await request("/api/cms/global", { token });
  assert.equal(initial.status, 200);
  const globalDraft = structuredClone(initial.body.draft) as CmsGlobalDocument;
  globalDraft.header.navItems = [
    { id: "custom-home", label: "Start", href: "/", visible: true, children: [] },
    ...globalDraft.header.navItems,
  ];
  globalDraft.footer.columns[0]!.title = "Explore";

  const save = await request("/api/cms/global", { method: "PUT", token, body: { draft: globalDraft } });
  assert.equal(save.status, 200);
  assert.deepEqual(save.body.draft, globalDraft);

  const blockedPublish = await request("/api/cms/global/publish", { method: "POST", token });
  assert.equal(blockedPublish.status, 409);
  assert.equal(blockedPublish.body.code, "CMS_PREVIEW_REQUIRED");

  const preview = await request("/api/cms/global/preview", { method: "POST", token, body: { draft: globalDraft } });
  assert.equal(preview.status, 200);

  const publish = await request("/api/cms/global/publish", { method: "POST", token });
  assert.equal(publish.status, 200);
  assert.deepEqual(publish.body.published, globalDraft);

  const publicGlobal = await request("/api/cms/public-global");
  assert.equal(publicGlobal.status, 200);
  assert.deepEqual(publicGlobal.body.published, globalDraft);

  const unpublish = await request("/api/cms/global/unpublish", { method: "POST", token });
  assert.equal(unpublish.status, 200);
  assert.equal(unpublish.body.published, null);
});

test("lets a developer save, publish, and unpublish a page", async () => {
  const token = signToken(developerId);
  const save = await request(`/api/cms/pages${slug}`, {
    method: "PUT",
    token,
    body: { draft: document },
  });
  assert.equal(save.status, 200);
  assert.deepEqual(save.body.draft, document);
  assert.equal(save.body.published, null);

  const blockedPublish = await request(`/api/cms/pages${slug}/publish`, {
    method: "POST",
    token,
  });
  assert.equal(blockedPublish.status, 409);
  assert.equal(blockedPublish.body.code, "CMS_PREVIEW_REQUIRED");

  const review = await request(`/api/cms/preview${slug}`, {
    method: "POST",
    token,
    body: { draft: document },
  });
  assert.equal(review.status, 200);

  const unpublished = await request(`/api/cms/public${slug}`);
  assert.equal(unpublished.status, 404);

  const publish = await request(`/api/cms/pages${slug}/publish`, {
    method: "POST",
    token,
  });
  assert.equal(publish.status, 200);
  assert.deepEqual(publish.body.draft, document);
  assert.deepEqual(publish.body.published, document);

  const publicPage = await request(`/api/cms/public${slug}`);
  assert.equal(publicPage.status, 200);
  assert.equal("draft" in publicPage.body, false);
  assert.deepEqual(publicPage.body.published, document);

  const unpublish = await request(`/api/cms/pages${slug}/unpublish`, {
    method: "POST",
    token,
  });
  assert.equal(unpublish.status, 200);
  assert.equal(unpublish.body.published, null);

  const hiddenAgain = await request(`/api/cms/public${slug}`);
  assert.equal(hiddenAgain.status, 404);
});

test("seeds the User dashboard as an editable page and publishes its overview content", async () => {
  const token = signToken(developerId);
  const pages = await request("/api/cms/pages", { token });
  assert.equal(pages.status, 200);
  const dashboard = pages.body.find((page: { slug: string }) => page.slug === dashboardSlug);
  assert.ok(dashboard);
  assert.equal(dashboard.label, "User dashboard");
  assert.equal(dashboard.draft.templateKey, "dashboard");
  assert.ok(dashboard.draft.sections.length > 0);

  const draft = structuredClone(dashboard.draft) as CmsDocument;
  draft.pageTitle = "Editable dashboard overview";
  const save = await request(`/api/cms/pages${dashboardSlug}`, {
    method: "PUT",
    token,
    body: { draft },
  });
  assert.equal(save.status, 200);

  const preview = await request(`/api/cms/preview${dashboardSlug}`, {
    method: "POST",
    token,
    body: { draft },
  });
  assert.equal(preview.status, 200);

  const publish = await request(`/api/cms/pages${dashboardSlug}/publish`, {
    method: "POST",
    token,
  });
  assert.equal(publish.status, 200);
  assert.equal(publish.body.published.pageTitle, "Editable dashboard overview");

  const publicPage = await request(`/api/cms/public${dashboardSlug}`);
  assert.equal(publicPage.status, 200);
  assert.equal(publicPage.body.published.templateKey, "dashboard");
  assert.equal(publicPage.body.published.pageTitle, "Editable dashboard overview");
});

test("returns the saved draft for a developer preview without changing published content", async () => {
  const token = signToken(developerId);
  const publishedDocument = structuredClone(document);
  const save = await request(`/api/cms/pages${slug}`, {
    method: "PUT",
    token,
    body: { draft: publishedDocument },
  });
  assert.equal(save.status, 200);

  const review = await request(`/api/cms/preview${slug}`, { method: "POST", token, body: { draft: publishedDocument } });
  assert.equal(review.status, 200);

  const publish = await request(`/api/cms/pages${slug}/publish`, { method: "POST", token });
  assert.equal(publish.status, 200);

  const draftDocument = structuredClone(document);
  draftDocument.pageTitle = "Preview-only draft";
  draftDocument.sections[0]!.title = "This is not public yet";
  const update = await request(`/api/cms/pages${slug}`, {
    method: "PUT",
    token,
    body: { draft: draftDocument },
  });
  assert.equal(update.status, 200);

  const preview = await request(`/api/cms/preview${slug}`, { token });
  assert.equal(preview.status, 200);
  assert.deepEqual(preview.body.draft, draftDocument);
  assert.deepEqual(preview.body.published, publishedDocument);

  const publicPage = await request(`/api/cms/public${slug}`);
  assert.equal(publicPage.status, 200);
  assert.deepEqual(publicPage.body.published, publishedDocument);
});

test("requires a fresh preview after the draft changes", async () => {
  const token = signToken(developerId);
  const baseline = structuredClone(document);
  const save = await request(`/api/cms/pages${slug}`, {
    method: "PUT",
    token,
    body: { draft: baseline },
  });
  assert.equal(save.status, 200);

  const preview = await request(`/api/cms/preview${slug}`, {
    method: "POST",
    token,
    body: { draft: baseline },
  });
  assert.equal(preview.status, 200);

  const publishBaseline = await request(`/api/cms/pages${slug}/publish`, { method: "POST", token });
  assert.equal(publishBaseline.status, 200);

  const changed = structuredClone(baseline);
  changed.pageTitle = "Changed after review";
  const changedSave = await request(`/api/cms/pages${slug}`, {
    method: "PUT",
    token,
    body: { draft: changed },
  });
  assert.equal(changedSave.status, 200);

  const blocked = await request(`/api/cms/pages${slug}/publish`, { method: "POST", token });
  assert.equal(blocked.status, 409);
  assert.equal(blocked.body.code, "CMS_PREVIEW_REQUIRED");

  const publicPage = await request(`/api/cms/public${slug}`);
  assert.equal(publicPage.status, 200);
  assert.deepEqual(publicPage.body.published, baseline);
});

test("restores the previous published version and keeps the replaced version as the next restore option", async () => {
  const token = signToken(developerId);
  const previous = structuredClone(document);
  previous.pageTitle = "Previous published design";
  const current = structuredClone(document);
  current.pageTitle = "Current published design";

  for (const draft of [previous, current]) {
    const save = await request(`/api/cms/pages${slug}`, { method: "PUT", token, body: { draft } });
    assert.equal(save.status, 200);
    const preview = await request(`/api/cms/preview${slug}`, { method: "POST", token, body: { draft } });
    assert.equal(preview.status, 200);
    const publish = await request(`/api/cms/pages${slug}/publish`, { method: "POST", token });
    assert.equal(publish.status, 200);
  }

  const beforeRestore = await request(`/api/cms/pages${slug}`, { token });
  assert.equal(beforeRestore.body.published.pageTitle, "Current published design");
  assert.equal(beforeRestore.body.publishedBackup.pageTitle, "Previous published design");

  const restore = await request(`/api/cms/pages${slug}/restore`, { method: "POST", token });
  assert.equal(restore.status, 200);
  assert.equal(restore.body.draft.pageTitle, "Previous published design");
  assert.equal(restore.body.published.pageTitle, "Previous published design");
  assert.equal(restore.body.publishedBackup.pageTitle, "Current published design");

  const publicPage = await request(`/api/cms/public${slug}`);
  assert.equal(publicPage.body.published.pageTitle, "Previous published design");
});

test("returns a validated unsaved preview without changing the saved or published document", async () => {
  const token = signToken(developerId);
  const savedDocument = structuredClone(document);
  const save = await request(`/api/cms/pages${slug}`, {
    method: "PUT",
    token,
    body: { draft: savedDocument },
  });
  assert.equal(save.status, 200);

  const unsavedDocument = structuredClone(document);
  unsavedDocument.pageTitle = "Unsaved preview only";
  unsavedDocument.sections[0]!.title = "This must not be saved";
  const preview = await request(`/api/cms/preview${slug}`, {
    method: "POST",
    token,
    body: { draft: unsavedDocument },
  });
  assert.equal(preview.status, 200);
  assert.deepEqual(preview.body.draft, unsavedDocument);

  const current = await request(`/api/cms/pages${slug}`, { token });
  assert.equal(current.status, 200);
  assert.deepEqual(current.body.draft, savedDocument);

  const malformedDocument = structuredClone(unsavedDocument) as Record<string, unknown>;
  const sections = malformedDocument.sections as Array<Record<string, unknown>>;
  const items = sections[0]!.items as Array<Record<string, unknown>>;
  items.push({ title: "Broken preview item", body: 42 });
  const rejected = await request(`/api/cms/preview${slug}`, {
    method: "POST",
    token,
    body: { draft: malformedDocument },
  });
  assert.equal(rejected.status, 400);
  assert.equal(rejected.body.error, "Invalid CMS draft document");

  const unchanged = await request(`/api/cms/pages${slug}`, { token });
  assert.deepEqual(unchanged.body.draft, savedDocument);
});

test("rejects malformed documents without replacing the existing draft", async () => {
  const token = signToken(developerId);
  const baseline = await request(`/api/cms/pages${slug}`, {
    method: "PUT",
    token,
    body: { draft: document },
  });
  assert.equal(baseline.status, 200);

  const malformedDocument = structuredClone(document) as Record<string, unknown>;
  const sections = malformedDocument.sections as Array<Record<string, unknown>>;
  const items = sections[0]!.items as Array<Record<string, unknown>>;
  items.push({ title: "Broken feature", body: 42 });

  const rejected = await request(`/api/cms/pages${slug}`, {
    method: "PUT",
    token,
    body: { draft: malformedDocument },
  });
  assert.equal(rejected.status, 400);
  assert.equal(rejected.body.error, "Invalid CMS draft document");
  assert.ok(rejected.body.details.some((issue: { path: unknown[] }) => (
    issue.path.join(".") === "sections.0.items.0.body"
  )));

  const unchanged = await request(`/api/cms/pages${slug}`, { token });
  assert.equal(unchanged.status, 200);
  assert.deepEqual(unchanged.body.draft, document);
});

test("accepts editable runtime settings and functional item links", async () => {
  const token = signToken(developerId);
  const pageSpecificDocument = structuredClone(document);
  pageSpecificDocument.sections = [
    {
      ...pageSpecificDocument.sections[0]!,
      id: "contact-form",
      settings: {
        formSubjects: ["Sales", "Support"],
        successTitle: "Thanks for reaching out",
        successText: "We will reply soon.",
      },
      items: [{
        title: "Email",
        body: "support@inndos.com",
        href: "mailto:support@inndos.com",
      }],
    },
  ];

  const saved = await request(`/api/cms/pages${slug}`, {
    method: "PUT",
    token,
    body: { draft: pageSpecificDocument },
  });

  assert.equal(saved.status, 200);
  assert.deepEqual(saved.body.draft, pageSpecificDocument);
});
