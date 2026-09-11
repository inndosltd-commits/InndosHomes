---
name: CMS global client auth
description: Direct global CMS fetches need the active developer bearer token.
---

The global Header/Footer editor uses direct fetch calls rather than the generated API hooks, so it must explicitly include the current auth token on every read and mutation.

**Why:** The global CMS endpoints require the exact developer role; unlike generated hooks, raw fetch does not receive the token getter automatically.

**How to apply:** When adding or changing a direct request in the global editor, include the current `Authorization: Bearer` header for load, save, preview, publish, restore, and unpublish.