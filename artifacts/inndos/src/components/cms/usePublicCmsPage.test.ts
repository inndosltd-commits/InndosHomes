import { describe, expect, it } from "vitest";
import type { CmsPublicPage } from "@workspace/api-client-react";
import { isPublishedCmsPage } from "./usePublicCmsPage";

const draft = {
  pageTitle: "Draft title",
  metaDescription: "Draft metadata",
  backgroundColor: "#ffffff",
  textColor: "#111111",
  accentColor: "#111111",
  sections: [],
};

const page = (published: CmsPublicPage["published"]): CmsPublicPage => ({
  slug: "/about",
  label: "About",
  published,
  publishedAt: "2026-09-04T00:00:00.000Z",
});

describe("public CMS page selection", () => {
  it("keeps the legacy component when the page is missing", () => {
    expect(isPublishedCmsPage(null)).toBe(false);
    expect(isPublishedCmsPage(undefined)).toBe(false);
  });

  it("uses the CMS renderer only after a document is published", () => {
    expect(isPublishedCmsPage(page({ ...draft, pageTitle: "Published title" }))).toBe(true);
  });
});