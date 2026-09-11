import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sourceRoot = resolve(import.meta.dirname, "../../../");
const readSource = (relativePath: string) => readFileSync(resolve(sourceRoot, relativePath), "utf8");

const publicSurfaceSources = {
  Navbar: readSource("src/components/layout/Navbar.tsx"),
  MobileTopNav: readSource("src/components/layout/MobileTopNav.tsx"),
  Login: readSource("src/pages/Login.tsx"),
};

const cmsSource = readSource("src/pages/DeveloperCMS.tsx");

const cmsOnlyTypographyClasses = [
  "font-sans",
  "font-black",
  "tracking-[-0.04em]",
  "tracking-[-0.05em]",
  "tracking-[0.2em]",
  "tracking-[0.22em]",
];

function classAttributeValues(source: string) {
  return [...source.matchAll(/\b(?:className|class)\s*=\s*(?:"([^"]*)"|'([^']*)'|`([^`]*)`)/g)]
    .flatMap((match) => [match[1], match[2], match[3]])
    .filter((value): value is string => Boolean(value));
}

describe("public styling boundary", () => {
  it("keeps CMS layout and semantic style markers on the CMS surface", () => {
    expect(cmsSource).toMatch(/\bcms-control-room\b/);
    expect(cmsSource).toMatch(/\bcms-label\b/);
    expect(cmsSource).toMatch(/\bcms-display\b/);

    for (const [surface, source] of Object.entries(publicSurfaceSources)) {
      const publicClasses = classAttributeValues(source).join(" ");
      expect(publicClasses, `${surface} must not use CMS-only classes`).not.toMatch(/\bcms-[a-z0-9-]+\b/);
    }
  });

  it("keeps CMS-only typography treatments out of public surfaces", () => {
    for (const [surface, source] of Object.entries(publicSurfaceSources)) {
      for (const className of cmsOnlyTypographyClasses) {
        expect(source, `${surface} must not use CMS typography class ${className}`).not.toContain(className);
      }
    }
  });
});