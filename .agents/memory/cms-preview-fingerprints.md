---
name: CMS preview fingerprints
description: Why CMS publish-review fingerprints must canonicalize JSON before hashing
---

CMS preview confirmation fingerprints must recursively sort object keys before hashing. PostgreSQL JSONB can return an unchanged document with a different object-key order than the original request, which would otherwise invalidate a legitimate preview.

**Why:** A request-order-sensitive hash caused an unchanged saved draft to fail the server-side publish gate after a preview round trip through JSONB.

**How to apply:** Use the same canonicalization for preview marking, draft comparison, and publish validation; arrays retain their order.