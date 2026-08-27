---
name: Mobile map bounds
description: Why the mobile browse feed must remain independent from the current map viewport.
---

The mobile map's current viewport may narrow the pins shown after “Search this area,” but it must not narrow the property collection used by browse cards or text, category, location, and price filters.

**Why:** Applying map bounds to the shared property API query made approved listings outside the user's initial location disappear before any other filter could search them.

**How to apply:** Fetch the complete approved feed for the selected property type, run browse filters against that feed, and apply viewport bounds only when deriving the properties passed to the map.