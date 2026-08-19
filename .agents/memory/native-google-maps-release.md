---
name: Native Google Maps release setup
description: Requirements for getting Google Maps into INNDOS iOS and Android EAS builds.
---

Native Google Maps keys are embedded during the EAS prebuild. The Replit workspace `GOOGLE_API_KEY` secret is not automatically available to a remote EAS build, so it must also exist as an EAS production secret under the same name.

**Why:** The app configuration reads `GOOGLE_API_KEY` while generating iOS and Android native projects. When the remote build lacks it, React Native Maps can render a blank/black Google map even though the website and local development environment have a valid key.

**How to apply:** Before any release that changes native maps or credentials, verify the EAS production environment includes `GOOGLE_API_KEY`, then create a new native build. Keep only a boolean configuration flag in JavaScript; never expose the key to the client bundle.