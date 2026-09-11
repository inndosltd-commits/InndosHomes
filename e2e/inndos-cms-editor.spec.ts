import { expect, test, type Page, type Route } from "@playwright/test";

type CmsSection = {
  id: string;
  type: "hero" | "content" | "feature" | "cta";
  label: string;
  eyebrow: string;
  title: string;
  body: string;
  buttonText: string;
  buttonHref: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  items: Array<{ title: string; body: string }>;
  visible: boolean;
};

type CmsDocument = {
  pageTitle: string;
  metaDescription: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  sections: CmsSection[];
};

type CmsPage = {
  slug: string;
  label: string;
  draft: CmsDocument;
  published: CmsDocument | null;
  publishedAt: string | null;
  updatedAt: string;
};

const initialDraft: CmsDocument = {
  pageTitle: "Contact INNDOS",
  metaDescription: "Reach the INNDOS team.",
  backgroundColor: "#f8f7f2",
  textColor: "#1b1b1b",
  accentColor: "#1b1b1b",
  sections: [{
    id: "contact-hero",
    type: "hero",
    label: "Contact hero",
    eyebrow: "Get in touch",
    title: "We are here to help.",
    body: "Send us a message and we will get back to you.",
    buttonText: "",
    buttonHref: "",
    backgroundColor: "#f8f7f2",
    textColor: "#1b1b1b",
    accentColor: "#1b1b1b",
    items: [],
    visible: true,
  }],
};

type PublicCmsRoute = {
  path: string;
  apiSlug: string;
  pageSlug: string;
  metaDescription: string;
  legacyHeading: string;
};

const legacyMetadata = {
  title: "inndos | Property Platform - B&B, Rent, Hostels, Hotels & Buy",
  description: "Kenya's #1 unified property marketplace. Find houses for sale in Nairobi, apartments for rent in Kenya, luxury & cheap hotels, B&B, hostels, land for sale and real estate listings across Nairobi, Mombasa, Kisumu & Nakuru.",
  ogTitle: "inndos | Buy, Rent & Book Property in Kenya – Nairobi, Mombasa, Kisumu",
  ogDescription: "Kenya's unified property marketplace. Buy houses, rent apartments, book hotels, B&B & hostels across Nairobi, Mombasa, Kisumu & Nakuru. Real estate listings for owners, agents, tenants & guests.",
  twitterTitle: "inndos | Kenya Property – Buy, Rent, Hotels & B&B",
  twitterDescription: "Find houses for sale, apartments for rent, hotels & B&B across Kenya. The smart property platform for Nairobi, Mombasa, Kisumu & beyond.",
};

const publicCmsRoutes: PublicCmsRoute[] = [
  { path: "/", apiSlug: "home", pageSlug: "/", metaDescription: "Home CMS metadata for property discovery.", legacyHeading: "Featured listings" },
  { path: "/about", apiSlug: "about", pageSlug: "/about", metaDescription: "About CMS metadata for the INNDOS team.", legacyHeading: "About inndos" },
  { path: "/bnb", apiSlug: "bnb", pageSlug: "/bnb", metaDescription: "B&B CMS metadata for stays across Kenya.", legacyHeading: "All B&B Stays" },
  { path: "/pricing", apiSlug: "pricing", pageSlug: "/pricing", metaDescription: "Pricing CMS metadata for clear booking plans.", legacyHeading: "Simple, transparent pricing" },
  { path: "/terms", apiSlug: "terms", pageSlug: "/terms", metaDescription: "Terms CMS metadata for using INNDOS.", legacyHeading: "Terms and Conditions for inndos Online Rental System" },
  { path: "/privacy", apiSlug: "privacy", pageSlug: "/privacy", metaDescription: "Privacy CMS metadata for INNDOS visitors.", legacyHeading: "Terms of Service & Privacy Policy" },
  { path: "/contact", apiSlug: "contact", pageSlug: "/contact", metaDescription: "Contact CMS metadata for reaching the INNDOS team.", legacyHeading: "Get in Touch" },
];

function publicCmsDocument(title: string, metaDescription = `${title} meta description`): CmsDocument {
  return {
    ...structuredClone(initialDraft),
    pageTitle: title,
    metaDescription,
    sections: [{
      ...structuredClone(initialDraft.sections[0]),
      id: `${title.toLowerCase().replace(/\W+/g, "-")}-hero`,
      title,
      body: `Published content for ${title}.`,
    }],
  };
}

function publicCmsPage(route: PublicCmsRoute): CmsPage {
  const publishedTitle = `Published ${route.apiSlug} CMS page`;
  const draftTitle = `Draft-only ${route.apiSlug} CMS page`;
  return {
    slug: route.pageSlug,
    label: route.apiSlug === "home" ? "Home" : route.apiSlug[0].toUpperCase() + route.apiSlug.slice(1),
    draft: publicCmsDocument(draftTitle),
    published: publicCmsDocument(publishedTitle, route.metaDescription),
    publishedAt: "2026-09-04T00:00:00.000Z",
    updatedAt: "2026-09-04T00:00:00.000Z",
  };
}

const developer = {
  id: "cms-e2e-developer",
  name: "CMS E2E Developer",
  email: "cms-e2e@example.test",
  role: "developer",
  status: "active",
  joinDate: "2026-09-04T00:00:00.000Z",
};

function makePage(published: CmsDocument | null = null): CmsPage {
  return {
    slug: "/contact",
    label: "Contact",
    draft: structuredClone(initialDraft),
    published,
    publishedAt: published ? "2026-09-04T00:00:00.000Z" : null,
    updatedAt: "2026-09-04T00:00:00.000Z",
  };
}

async function respond(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function mockCmsApi(page: Page) {
  let cmsPage = makePage();
  let failNextSave = false;
  const saveRequests: CmsDocument[] = [];

  await page.context().route("**/api/**", async (route) => {
    const request = route.request();
    const { pathname } = new URL(request.url());

    if (pathname === "/api/auth/me") {
      await respond(route, developer);
      return;
    }

    if (pathname === "/api/cms/pages" && request.method() === "GET") {
      await respond(route, [cmsPage]);
      return;
    }

    if (pathname === "/api/cms/pages/contact" && request.method() === "GET") {
      await respond(route, cmsPage);
      return;
    }

    if (pathname === "/api/cms/pages/contact" && request.method() === "PUT") {
      const body = request.postDataJSON() as { draft?: CmsDocument };
      if (failNextSave) {
        failNextSave = false;
        await respond(route, { error: "Draft could not be saved. Please retry." }, 503);
        return;
      }

      expect(body.draft).toBeTruthy();
      saveRequests.push(structuredClone(body.draft!));
      cmsPage = { ...cmsPage, draft: structuredClone(body.draft!) };
      await respond(route, cmsPage);
      return;
    }

    if (pathname === "/api/cms/preview/contact" && request.method() === "GET") {
      await respond(route, {
        slug: cmsPage.slug,
        label: cmsPage.label,
        draft: structuredClone(cmsPage.draft),
        published: structuredClone(cmsPage.published),
        updatedAt: "2026-09-04T00:00:00.000Z",
      });
      return;
    }

    if (pathname === "/api/cms/preview/contact" && request.method() === "POST") {
      const body = request.postDataJSON() as { draft?: CmsDocument };
      expect(body.draft).toBeTruthy();
      await respond(route, {
        slug: cmsPage.slug,
        label: cmsPage.label,
        draft: structuredClone(body.draft),
        published: structuredClone(cmsPage.published),
        updatedAt: "2026-09-04T00:00:00.000Z",
      });
      return;
    }

    if (pathname === "/api/cms/pages/contact/publish" && request.method() === "POST") {
      cmsPage = {
        ...cmsPage,
        published: structuredClone(cmsPage.draft),
        publishedAt: "2026-09-04T00:00:00.000Z",
      };
      await respond(route, cmsPage);
      return;
    }

    if (pathname === "/api/cms/pages/contact/unpublish" && request.method() === "POST") {
      cmsPage = { ...cmsPage, published: null, publishedAt: null };
      await respond(route, cmsPage);
      return;
    }

    if (pathname === "/api/cms/public/contact") {
      if (!cmsPage.published) {
        await respond(route, { error: "No published CMS page" }, 404);
      } else {
        await respond(route, cmsPage);
      }
      return;
    }

    await route.continue();
  });

  return {
    failNextSave: () => { failNextSave = true; },
    saveRequests,
  };
}

async function mockPublicCmsApi(page: Page) {
  const pages = new Map(publicCmsRoutes.map((route) => [route.apiSlug, publicCmsPage(route)]));

  await page.route("**/api/cms/public/**", async (route) => {
    const { pathname } = new URL(route.request().url());
    const apiSlug = pathname.split("/").pop();
    const cmsPage = apiSlug ? pages.get(apiSlug) : undefined;

    if (!cmsPage?.published) {
      await respond(route, { error: "No published CMS page" }, 404);
      return;
    }

    await respond(route, cmsPage);
  });

  return {
    unpublish: (apiSlug: string) => {
      const cmsPage = pages.get(apiSlug);
      expect(cmsPage).toBeTruthy();
      if (cmsPage) {
        cmsPage.published = null;
        cmsPage.publishedAt = null;
      }
    },
  };
}

function liveStatus(page: Page) {
  return page.locator("main").getByText(/^(Draft only|Published)$/).first();
}

test.describe("Developer CMS editor", () => {
  test("opens a protected full-page preview of the current unsaved draft", async ({ page, context }) => {
    await mockCmsApi(page);
    await page.addInitScript(() => localStorage.setItem("inndos_token", "cms-e2e-token"));
    await page.goto("/#/developer/cms");

    const previewPagePromise = context.waitForEvent("page");
    await page.getByTestId("link-cms-draft-preview").click();
    const previewPage = await previewPagePromise;
    await previewPage.waitForLoadState();

    await expect(previewPage.getByText("Contact · not saved or published")).toBeVisible();
    await expect(previewPage.getByTestId("cms-unsaved-preview-banner")).toContainText("public page is unchanged");
    await expect(previewPage.getByRole("heading", { name: "We are here to help." })).toBeVisible();
    await expect(previewPage.getByTestId("link-back-to-cms-editor")).toBeVisible();
  });

  test("renders the latest unsaved edits without saving or changing the public page", async ({ page, context }) => {
    const api = await mockCmsApi(page);
    await page.addInitScript(() => localStorage.setItem("inndos_token", "cms-e2e-token"));
    await page.goto("/#/developer/cms");

    await page.getByTestId("input-cms-page-title").fill("Unsaved contact page");
    await page.getByTestId("input-section-title-contact-hero").fill("Preview this before saving");

    const previewPagePromise = context.waitForEvent("page");
    await page.getByTestId("link-cms-draft-preview").click();
    const previewPage = await previewPagePromise;
    await previewPage.waitForLoadState();

    await expect(previewPage).toHaveTitle("Unsaved contact page");
    await expect(previewPage.getByRole("heading", { name: "Preview this before saving" })).toBeVisible();
    await expect(previewPage.getByTestId("cms-unsaved-preview-banner")).toBeVisible();
    expect(api.saveRequests).toHaveLength(0);

    await previewPage.close();
    await page.goto("/contact");
    await expect(page.getByRole("heading", { name: "Get in Touch" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Preview this before saving" })).toHaveCount(0);
  });

  test("edits, saves, publishes, and unpublishes a page through the browser", async ({ page }) => {
    const api = await mockCmsApi(page);
    await page.addInitScript(() => localStorage.setItem("inndos_token", "cms-e2e-token"));
    await page.goto("/#/developer/cms");

    const title = page.getByTestId("input-cms-page-title");
    await expect(title).toHaveValue("Contact INNDOS");
    await expect(liveStatus(page)).toHaveText("Draft only");
    await expect(page.getByTestId("button-unpublish-cms-page")).toHaveCount(0);

    await title.fill("Contact the INNDOS team");
    await page.getByTestId("button-save-cms-draft").click();
    await expect(page.getByTestId("status-cms-feedback")).toHaveText("Draft saved. It is not public until you publish it.");
    await expect(liveStatus(page)).toHaveText("Draft only");
    expect(api.saveRequests).toHaveLength(1);
    expect(api.saveRequests[0].pageTitle).toBe("Contact the INNDOS team");

    await page.getByTestId("button-publish-cms-page").click();
    await expect(page.getByTestId("status-cms-feedback")).toHaveText("Published to the public website.");
    await expect(liveStatus(page)).toHaveText("Published");
    await expect(page.getByTestId("button-unpublish-cms-page")).toBeVisible();

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByTestId("button-unpublish-cms-page").click();
    await expect(page.getByTestId("status-cms-feedback")).toHaveText("Unpublished. The legacy page is live again.");
    await expect(liveStatus(page)).toHaveText("Draft only");
    await expect(page.getByTestId("button-unpublish-cms-page")).toHaveCount(0);
  });

  test("compares the saved draft with the currently live page", async ({ page }) => {
    await mockCmsApi(page);
    await page.addInitScript(() => localStorage.setItem("inndos_token", "cms-e2e-token"));
    await page.goto("/#/developer/cms");

    await page.getByTestId("button-publish-cms-page").click();
    await expect(page.getByTestId("status-cms-feedback")).toHaveText("Published to the public website.");

    await page.getByTestId("input-cms-page-title").fill("Updated contact page");
    await page.getByTestId("input-section-title-contact-hero").fill("A changed hero");
    await page.getByTestId("button-save-cms-draft").click();
    await page.getByTestId("button-toggle-cms-comparison").click();

    await expect(page.getByTestId("cms-comparison")).toBeVisible();
    await expect(page.getByTestId("cms-comparison-draft")).toContainText("A changed hero");
    await expect(page.getByTestId("cms-comparison-live")).toContainText("We are here to help.");
    await expect(page.getByTestId("cms-change-marker-changed")).toHaveCount(2);
    await expect(page.getByText("Page settings changed")).toBeVisible();
  });

  test("renders published content publicly after navigation and hides the draft after unpublishing and refresh", async ({ page }) => {
    await mockCmsApi(page);
    await page.addInitScript(() => localStorage.setItem("inndos_token", "cms-e2e-token"));
    await page.goto("/#/developer/cms");

    const title = page.getByTestId("input-cms-page-title");
    await title.fill("Published contact page");
    await page.getByTestId("input-section-title-contact-hero").fill("Published contact page");
    await page.getByTestId("button-publish-cms-page").click();
    await expect(page.getByTestId("status-cms-feedback")).toHaveText("Published to the public website.");

    await page.goto("/contact");
    await expect(page.getByTestId("cms-public-page-/contact")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Published contact page" })).toBeVisible();
    await expect(page).toHaveTitle("Published contact page");
    await expect(page.getByRole("heading", { name: "Get in Touch" })).toHaveCount(0);

    await page.reload();
    await expect(page.getByTestId("cms-public-page-/contact")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Published contact page" })).toBeVisible();
    await expect(page).toHaveTitle("Published contact page");

    await page.goto("/#/developer/cms");
    await expect(title).toHaveValue("Published contact page");
    await title.fill("Draft-only contact page");
    await page.getByTestId("input-section-title-contact-hero").fill("Draft-only contact page");
    await page.getByTestId("button-save-cms-draft").click();
    await expect(page.getByTestId("status-cms-feedback")).toHaveText("Draft saved. It is not public until you publish it.");

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByTestId("button-unpublish-cms-page").click();
    await expect(page.getByTestId("status-cms-feedback")).toHaveText("Unpublished. The legacy page is live again.");

    await page.goto("/contact");
    await expect(page.getByRole("heading", { name: "Get in Touch" })).toBeVisible();
    await expect(page.getByTestId("cms-public-page-/contact")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Draft-only contact page" })).toHaveCount(0);
    await expect(page).not.toHaveTitle("Draft-only contact page");

    await page.reload();
    await expect(page.getByRole("heading", { name: "Get in Touch" })).toBeVisible();
    await expect(page.getByTestId("cms-public-page-/contact")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Draft-only contact page" })).toHaveCount(0);
    await expect(page).not.toHaveTitle("Draft-only contact page");
  });

  test("keeps an edited draft and shows the server error when saving fails", async ({ page }) => {
    const api = await mockCmsApi(page);
    await page.addInitScript(() => localStorage.setItem("inndos_token", "cms-e2e-token"));
    await page.goto("/#/developer/cms");

    const title = page.getByTestId("input-cms-page-title");
    await title.fill("Keep this unsaved change");
    api.failNextSave();
    await page.getByTestId("button-save-cms-draft").click();

    await expect(page.getByTestId("status-cms-feedback")).toContainText("Draft could not be saved. Please retry.");
    await expect(title).toHaveValue("Keep this unsaved change");
    await expect(liveStatus(page)).toHaveText("Draft only");
  });

  test("edits section content, keeps add/delete state consistent, and saves the complete document", async ({ page }) => {
    const api = await mockCmsApi(page);
    await page.addInitScript(() => localStorage.setItem("inndos_token", "cms-e2e-token"));
    await page.goto("/#/developer/cms");

    const heroSection = page.getByTestId("editor-section-contact-hero");
    await heroSection.getByTestId("input-section-label-contact-hero").fill("Support hero");
    await heroSection.getByTestId("input-section-title-contact-hero").fill("We make every stay clearer.");
    await heroSection.getByTestId("textarea-section-body-contact-hero").fill("Get direct help before, during, and after your stay.");
    await heroSection.getByTestId("button-toggle-section-contact-hero").click();
    await expect(heroSection.getByTestId("button-toggle-section-contact-hero")).toHaveText("Hidden");

    await page.getByTestId("button-add-feature-section").click();
    await page.getByTestId("button-add-content-section").click();
    await expect(page.locator('[data-testid^="editor-section-"]')).toHaveCount(3);

    const featureSection = page.locator('[data-testid^="editor-section-feature-"]');
    await expect(featureSection).toHaveCount(1);
    const featureSectionId = await featureSection.getAttribute("data-testid");
    expect(featureSectionId).toBeTruthy();
    const featureId = featureSectionId!.replace("editor-section-", "");
    await featureSection.getByTestId(`input-section-label-${featureId}`).fill("Trust signals");
    await featureSection.getByTestId(`input-section-title-${featureId}`).fill("Built for confident decisions.");
    await featureSection.getByTestId(`textarea-section-body-${featureId}`).fill("Keep important details visible at every step.");
    await featureSection.getByTestId(`input-item-title-${featureId}-0`).fill("Direct communication");
    await featureSection.getByTestId(`input-item-body-${featureId}-0`).fill("Ask questions and get answers from the people behind the listing.");
    await featureSection.getByTestId(`button-add-item-${featureId}`).click();
    await featureSection.getByTestId(`input-item-title-${featureId}-1`).fill("Clear next steps");
    await featureSection.getByTestId(`input-item-body-${featureId}-1`).fill("Know what happens after you choose a property.");

    const contentSection = page.locator('[data-testid^="editor-section-content-"]');
    await expect(contentSection).toHaveCount(1);
    const contentSectionId = await contentSection.getAttribute("data-testid");
    expect(contentSectionId).toBeTruthy();
    const contentId = contentSectionId!.replace("editor-section-", "");
    await contentSection.getByTestId(`input-section-label-${contentId}`).fill("Temporary content");
    await contentSection.getByTestId(`button-delete-section-${contentId}`).click();
    await expect(page.locator('[data-testid^="editor-section-"]')).toHaveCount(2);
    await expect(page.getByTestId(`editor-section-${contentId}`)).toHaveCount(0);

    await page.getByTestId("button-save-cms-draft").click();
    await expect(page.getByTestId("status-cms-feedback")).toHaveText("Draft saved. It is not public until you publish it.");
    expect(api.saveRequests).toHaveLength(1);
    expect(api.saveRequests[0]).toEqual({
      ...initialDraft,
      sections: [
        {
          ...initialDraft.sections[0],
          label: "Support hero",
          title: "We make every stay clearer.",
          body: "Get direct help before, during, and after your stay.",
          visible: false,
        },
        expect.objectContaining({
          type: "feature",
          label: "Trust signals",
          title: "Built for confident decisions.",
          body: "Keep important details visible at every step.",
          buttonText: "",
          buttonHref: "",
          backgroundColor: "#f8f7f2",
          textColor: "#1b1b1b",
          accentColor: "#1b1b1b",
          visible: true,
          items: [
            { title: "Direct communication", body: "Ask questions and get answers from the people behind the listing." },
            { title: "Clear next steps", body: "Know what happens after you choose a property." },
          ],
        }),
      ],
    });
  });
});

test.describe("Public CMS route matrix", () => {
  test("renders each published page after a fresh browser load", async ({ page }) => {
    await mockPublicCmsApi(page);

    for (const route of publicCmsRoutes) {
      const publishedTitle = `Published ${route.apiSlug} CMS page`;
      await page.goto(route.path);
      await page.reload();

      await expect(page.getByTestId(`cms-public-page-${route.pageSlug}`)).toBeVisible();
      await expect(page.getByRole("heading", { name: publishedTitle })).toBeVisible();
      await expect(page).toHaveTitle(publishedTitle);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", route.metaDescription);
      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", publishedTitle);
      await expect(page.locator('meta[property="og:description"]')).toHaveAttribute("content", route.metaDescription);
      await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute("content", publishedTitle);
      await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute("content", route.metaDescription);
      await expect(page.getByRole("heading", { name: route.legacyHeading })).toHaveCount(0);
    }
  });

  test("unpublishing one page restores only its legacy fallback and never exposes its draft", async ({ page }) => {
    const api = await mockPublicCmsApi(page);
    const unpublishedRoute = publicCmsRoutes.find((route) => route.apiSlug === "about")!;

    api.unpublish(unpublishedRoute.apiSlug);

    await page.goto(unpublishedRoute.path);
    await page.reload();

    await expect(page.getByRole("heading", { name: unpublishedRoute.legacyHeading })).toBeVisible();
    await expect(page.getByTestId(`cms-public-page-${unpublishedRoute.pageSlug}`)).toHaveCount(0);
    await expect(page.getByRole("heading", { name: `Draft-only ${unpublishedRoute.apiSlug} CMS page` })).toHaveCount(0);
    await expect(page).not.toHaveTitle(`Draft-only ${unpublishedRoute.apiSlug} CMS page`);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      "Kenya's #1 unified property marketplace. Find houses for sale in Nairobi, apartments for rent in Kenya, luxury & cheap hotels, B&B, hostels, land for sale and real estate listings across Nairobi, Mombasa, Kisumu & Nakuru.",
    );
    await expect(page).toHaveTitle("inndos | Property Platform - B&B, Rent, Hostels, Hotels & Buy");
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", legacyMetadata.ogTitle);
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute("content", legacyMetadata.ogDescription);
    await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute("content", legacyMetadata.twitterTitle);
    await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute("content", legacyMetadata.twitterDescription);

    for (const route of publicCmsRoutes.filter((candidate) => candidate.apiSlug !== unpublishedRoute.apiSlug)) {
      const publishedTitle = `Published ${route.apiSlug} CMS page`;
      await page.goto(route.path);
      await page.reload();

      await expect(page.getByTestId(`cms-public-page-${route.pageSlug}`)).toBeVisible();
      await expect(page.getByRole("heading", { name: publishedTitle })).toBeVisible();
      await expect(page).toHaveTitle(publishedTitle);
    }
  });

  test("resets metadata while navigating between a published CMS page and an unpublished legacy page", async ({ page }) => {
    const api = await mockPublicCmsApi(page);
    api.unpublish("about");

    await page.goto("/");
    await expect(page.getByTestId("cms-public-page-/")).toBeVisible();
    await expect(page).toHaveTitle("Published home CMS page");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", "Home CMS metadata for property discovery.");

    await page.evaluate(() => {
      window.location.hash = "/about";
    });
    await expect(page.getByRole("heading", { name: "About inndos" })).toBeVisible();
    await expect(page.getByTestId("cms-public-page-/")).toHaveCount(0);
    await expect(page).toHaveTitle(legacyMetadata.title);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", legacyMetadata.description);

    await page.evaluate(() => {
      window.location.hash = "/";
    });
    await expect(page.getByTestId("cms-public-page-/")).toBeVisible();
    await expect(page).toHaveTitle("Published home CMS page");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", "Home CMS metadata for property discovery.");
  });
});
