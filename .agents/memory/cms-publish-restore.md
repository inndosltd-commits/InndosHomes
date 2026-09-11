---
name: CMS publish restore snapshots
description: CMS publishing keeps one reversible snapshot of the page version that was live immediately before the latest publish.
---

CMS page publishing should preserve the previous published document and timestamp as a one-step restore snapshot. Restoring swaps the current published document into the snapshot slot, so the last two published versions remain reversible.

**Why:** Developers need a safe way to undo a newly published design without deleting the draft or falling back to the legacy page.

**How to apply:** Keep Restore separate from Unpublish: Restore replaces the public page with the previous CMS version, while Unpublish intentionally returns the legacy component fallback.