---
name: Auth-gated hook order
description: Auth redirects and loading states must not skip hooks in route components.
---

Route components that wait for authentication must keep every hook call above loading or role-based early returns; only rendered markup may be conditional.

**Why:** React error #310 appears when authentication changes from loading to loaded and a hook below the early return is introduced on the next render.

**How to apply:** Place resize, event, data, and lifecycle hooks before auth/loading returns, and let their effects no-op until the required user or token exists.