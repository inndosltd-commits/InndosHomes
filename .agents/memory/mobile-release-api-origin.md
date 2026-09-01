---
name: Mobile release API origin
description: Release mobile binaries must target the canonical production API while development builds use the Replit host.
---

Release builds should prefer the production API origin baked into app configuration; only development builds should prefer the injected workspace domain.

**Why:** The website can use the live origin while an older mobile binary keeps a stale build-time host, causing platform-specific payment or data behavior.

**How to apply:** Keep the development override for Expo Go, but require a new native build after changing the release API origin.