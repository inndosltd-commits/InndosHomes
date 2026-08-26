---
name: Presigned listing media trust
description: Security boundary for attaching direct-to-storage uploads to INNDOS listings.
---

Client-declared upload metadata is not proof of the stored object's size or media class. Before a storage path is persisted as listing media, verify that it belongs to the listing owner and inspect the stored object itself.

**Why:** The Replit object-storage sidecar's presigned PUT URL binds the destination and HTTP method, but client-declared size and content type can still be falsified. Grant-time checks alone therefore cannot enforce plan or media policy.

**How to apply:** Any new route that attaches uploaded objects to listings must preserve owner-scoped paths, actual byte-size checks, media decoding/probing, and plan limits at the persistence boundary. For video, retry briefly for storage readiness, then probe a downloaded local temporary file rather than a signed URL; signed-URL network behavior must not decide whether valid stored media is accepted.