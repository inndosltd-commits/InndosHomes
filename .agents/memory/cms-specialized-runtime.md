---
name: CMS specialized runtime blocks
description: Page-specific CMS sections preserve live behavior while allowing unique preset IDs.
---

Specialized CMS rendering must resolve behavior from a stable settings component key when present, with a stable section-ID prefix as the fallback for newly added preset sections.

**Why:** Developers can add multiple copies of a runtime block, so exact legacy IDs alone would silently degrade new sections to generic content and break live forms, filters, or actions.

**How to apply:** Keep live data and submission behavior in the renderer; expose editable copy and bounded settings through the validated CMS document schema, and route both seeded IDs and generated preset IDs through the same runtime.