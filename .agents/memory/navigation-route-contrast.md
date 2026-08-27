---
name: Navigation route contrast
description: Cross-platform color rule for visible route lines and turn directions.
---

Navigation route strokes must use a dedicated high-contrast route color rather than the general theme primary token. The primary token changes between light and dark themes and may become white against a map.

**Why:** Native map styling is not automatically synchronized with the app theme, so a white route can disappear against the map in dark mode.

**How to apply:** Keep route-line colors blue or another map-safe high-contrast color on Android, iOS, and web. Use theme-aware foreground/background tokens for instruction panels, but do not reuse the theme primary token for the route stroke.