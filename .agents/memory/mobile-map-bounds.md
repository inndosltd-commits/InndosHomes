---
name: Mobile map bounds
description: Why the mobile browse feed must remain independent from the current map viewport.
---

Automatic map positioning may narrow the pins shown without narrowing the home feed. Explicit user actions—selecting a searched place or pressing “Search this area”—must narrow both the map pins and every home-page property section.

**Why:** Applying automatic geolocation bounds to the shared API query hid approved listings before other filters could search them, while keeping explicit place bounds map-only made visible search results disagree with the rest of the home page.

**How to apply:** Fetch the complete approved feed. Keep automatic focus bounds map-only, but apply bounds from explicit place selection or “Search this area” when deriving both map pins and home-page sections.