---
name: Expo Launch Maps key
description: Environment naming required to inject the native Google Maps key during Replit Expo Launch prebuild.
---

Use an `EXPO_PUBLIC_`-prefixed Replit secret for the Google Maps key consumed by the native config plugin during Expo Launch, while retaining the non-prefixed variable as a compatibility fallback for other build environments.

**Why:** Expo Launch reached native prebuild without the existing non-prefixed workspace secret, causing the build safeguard to fail before Xcode. The prefixed build variable is forwarded through the mobile publishing flow.

**How to apply:** Any release-time native config that depends on the Maps key must accept the Expo Launch-compatible variable and fail before compilation when neither supported variable exists. Never hardcode the value in static Expo configuration.