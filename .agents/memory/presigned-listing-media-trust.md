---
name: Presigned listing media trust
description: Security boundary for attaching direct-to-storage uploads to INNDOS listings.
---

Client-declared upload metadata is not proof of the stored object's size or media class. Before a storage path is persisted as listing media, verify that it belongs to the listing owner and inspect the stored object itself.

**Why:** The Replit object-storage sidecar's presigned PUT URL binds the destination and HTTP method, but client-declared size and content type can still be falsified. Grant-time checks alone therefore cannot enforce plan or media policy.

**How to apply:** Any new route that attaches uploaded objects to listings must preserve owner-scoped paths, actual byte-size checks before and during streaming, media decoding/probing, and plan limits at the persistence boundary. Treat native MIME values as hints only. For video, retry storage readiness, probe a capped local temporary file, and normalize accepted sources to a server-controlled MP4/H.264/AAC object before persistence so every client receives the same playback contract. Never serve direct-upload objects with an executable client-controlled MIME type.