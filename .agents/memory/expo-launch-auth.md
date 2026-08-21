---
name: Expo Launch ownership
description: Avoiding ownership conflicts between Replit-managed Expo projects and personal Expo accounts.
---

## Rule
For a project created and published by Replit Expo Launch, preserve the existing EAS `projectId` but do not add a personal Expo `owner` to `app.json` or a personal `EXPO_TOKEN` override to Replit Secrets.

**Why:** Expo Launch uses a Replit-managed Expo account (visible as `replit-private-…` in EAS build URLs). Claiming that linked project under a personal owner or overriding Replit's credentials with a personal token causes `EXPO_UNAUTHORIZED` before the EAS workflow starts.

**How to apply:**
- Check the EAS workflow URL or original project setup to determine whether the project is Replit-managed.
- If it is Replit-managed, retain its `extra.eas.projectId`, omit `owner`, and let the Publishing panel supply its own authentication.
- Do not use a personal Expo CLI login as evidence of ownership of the Replit-managed EAS project.
- If `launch.expo.dev` returns `EXPO_UNAUTHORIZED` before an EAS workflow is created, treat it as a Publishing/Expo connection failure rather than an app-config failure. Use Replit's Project Editor `EAS init` recovery flow; do not churn owner fields or personal tokens.
