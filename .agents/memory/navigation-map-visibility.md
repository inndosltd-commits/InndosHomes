---
name: Navigation map visibility
description: Cross-platform layout rule for live property directions and route details.
---

Live property navigation must keep the primary map unobstructed. On the website, use separate reserved regions for the current instruction, map, and bounded scrollable details. On native mobile, keep compact controls on the map but place the turn list below it.

**Why:** Large instruction and route-detail overlays can leave too little usable map area, hiding the route and important nearby context.

**How to apply:** Any future directions redesign should preserve an always-visible map, keep route summary and travel mode accessible, and make long step lists scroll independently outside the map.