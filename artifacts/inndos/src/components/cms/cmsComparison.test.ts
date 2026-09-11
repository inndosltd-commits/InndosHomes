import { describe, expect, it } from "vitest";
import type { CmsDocument } from "@workspace/api-client-react";
import { compareCmsDocuments } from "./CmsRenderer";

const section = (id: string, title = id) => ({
  id,
  type: "content" as const,
  label: title,
  eyebrow: "",
  title,
  body: "",
  buttonText: "",
  buttonHref: "",
  backgroundColor: "#ffffff",
  textColor: "#111111",
  accentColor: "#111111",
  items: [],
  visible: true,
});

const document = (sections: CmsDocument["sections"]): CmsDocument => ({
  pageTitle: "Test page",
  metaDescription: "Test description",
  backgroundColor: "#ffffff",
  textColor: "#111111",
  accentColor: "#111111",
  sections,
});

describe("compareCmsDocuments", () => {
  it("identifies added, removed, and changed sections on both sides", () => {
    const draft = document([section("same"), section("changed", "New title"), section("added")]);
    const published = document([section("same"), section("changed", "Old title"), section("removed")]);

    const result = compareCmsDocuments(draft, published);

    expect(result.draftStatuses).toMatchObject({
      same: "unchanged",
      changed: "changed",
      added: "added",
    });
    expect(result.publishedStatuses).toMatchObject({
      same: "unchanged",
      changed: "changed",
      removed: "removed",
    });
    expect(result.added).toBe(1);
    expect(result.removed).toBe(1);
    expect(result.changed).toBe(1);
  });

  it("marks every draft section as added when the page has never been published", () => {
    const result = compareCmsDocuments(document([section("first"), section("second")]), null);

    expect(result.draftStatuses).toEqual({ first: "added", second: "added" });
    expect(result.publishedStatuses).toEqual({});
    expect(result.added).toBe(2);
    expect(result.removed).toBe(0);
    expect(result.changed).toBe(0);
  });

  it("detects page-level settings changes even when sections are unchanged", () => {
    const draft = document([section("same")]);
    const published = { ...document([section("same")]), pageTitle: "Updated title" };

    expect(compareCmsDocuments(draft, published).settingsChanged).toBe(true);
  });
});