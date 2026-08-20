---
name: Expo Launch Maps key
description: Environment naming required to inject the native Google Maps key during Replit Expo Launch prebuild.
---

Use an `EXPO_PUBLIC_`-prefixed **Publishing Deployment Secret** for the Google Maps key consumed by the native config plugin during Expo Launch, while retaining the non-prefixed variable as a compatibility fallback for other build environments.

**Why:** Expo Launch reached native prebuild without both the existing non-prefixed workspace secret and a later prefixed project secret. The publishing environment receives Deployment Secrets configured under Publishing settings, not development/project secrets alone.

**How to apply:** Add the prefixed key to Publishing → Adjust settings → Deployment secrets before launching. Native config must fail before compilation when neither supported variable exists. Never hardcode the value in source.