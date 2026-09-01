---
name: Expo build Metro port
description: The static Expo build must avoid ports already occupied by other workspace services.
---

The static Expo build should select an available local Metro port instead of assuming 8081.

**Why:** The mockup preview service commonly occupies 8081. Expo then prompts for another port, but publish builds are non-interactive and time out.

**How to apply:** Keep Metro's selected port shared by health checks, bundle requests, manifest requests, and asset URL processing.