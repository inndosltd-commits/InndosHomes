---
name: Navigation map visibility
description: Cross-platform layout rule for live property directions and route details.
---

Live property navigation must keep the primary map unobstructed. On the website, use separate reserved regions for the current instruction, map, and bounded scrollable details. On native mobile, keep compact controls on the map but place the turn list below it.

Route endpoints must use explicit INNDOS markers anchored to the saved listing coordinates. The destination marker should display the exact property title; never expose Google’s generic A/B endpoint labels.

**Why:** Large instruction and route-detail overlays can leave too little usable map area, hiding the route and important nearby context.

**How to apply:** Any future directions redesign should preserve an always-visible map, keep route summary and travel mode accessible, make long step lists scroll independently outside the map, and retain property-title endpoint markers.