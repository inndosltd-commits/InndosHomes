---
name: Expo project ownership
description: Diagnosing Expo authorization from the linked EAS project rather than assumptions about the CLI account.
---

## Rule
Use the owner resolved from `extra.eas.projectId` as the source of truth. The Expo CLI account and the `expo.owner` setting must match that owner when the project is built directly with EAS.

**Why:** An Expo CLI session may belong to a different account even when its username looks nearly identical. EAS then reports either an unauthorized entity read or an owner mismatch. The linked project ID reveals the actual owner in EAS diagnostics.

**How to apply:**
- Preserve the linked `extra.eas.projectId`; do not create a replacement project just to bypass access errors.
- When EAS identifies the project owner and asks for an `expo.owner`, set it to that exact account name.
- Log out of Expo, log back in to that exact owner account, and confirm with `npx expo whoami` before any EAS build or EAS init.
- If Expo Launch still returns `EXPO_UNAUTHORIZED` before a workflow begins after the correct account connection is restored, use Replit's Project Editor `EAS init` recovery flow.
