---
name: CMS styling boundary
description: The visual relationship between the developer CMS and public website surfaces.
---

CMS styling should make the developer control room feel consistent with the front pages without changing established public website surfaces such as the header, login page, or public navigation.

**Why:** The CMS restyle was accidentally applied to the shared public Navbar and login page, changing the original user-facing layout and typography. Public surfaces are product UI and must retain their established treatment.

**How to apply:** Scope control-room font, tracking, and label styles to `DeveloperCMS` and CMS-only components. When updating shared layout components or public pages, preserve existing public styles unless the user explicitly requests a public redesign.