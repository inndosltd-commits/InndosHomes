---
name: Hash-router links
description: Internal web navigation uses the URL hash, including query parameters for dashboard tabs.
---

CMS and other control-room references that navigate the web app must write internal destinations into the hash, such as `#/dashboard?tab=listings`, rather than using a normal pathname URL.

**Why:** A normal `/dashboard?tab=...` anchor can leave the hash router and lose the tab query, which makes a valid destination look like a no-op or blank panel.

**How to apply:** Prefer hash-native anchors or the app's hash-aware navigation helper for internal links. Also provide an explicit access state when a developer account reaches a role-gated owner or admin panel.