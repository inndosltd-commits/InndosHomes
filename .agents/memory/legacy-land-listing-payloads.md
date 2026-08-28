---
name: Legacy land listing payloads
description: Backward-compatibility rule for land listings submitted by older native app builds.
---

When a sale listing contains a structured land-details block but no subtype, treat and persist it as subtype `land`.

**Why:** Older installed mobile builds can identify land through their details payload while omitting the canonical subtype, causing valid listings to fail completeness checks until every user updates the app.

**How to apply:** Keep API write-boundary validation strict for genuinely incomplete land data, but resolve the effective subtype from structured land details before category completeness checks and persistence.