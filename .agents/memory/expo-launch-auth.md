---
name: Expo project ownership
description: Diagnosing Expo authorization from the linked EAS project rather than assumptions about the CLI account.
---

## Rule
Use the owner resolved from `extra.eas.projectId` as the source of truth for `expo.owner`. The Expo CLI user must have permission to the project, but can be a separate member user rather than the owner account itself.

**Why:** An Expo CLI session may belong to a different account even when its username looks nearly identical. A project can be owned by an Expo organization/account while an individual user is a member. EAS then reports either an unauthorized entity read or an owner mismatch depending on the configuration. The linked project ID reveals the actual owner in EAS diagnostics.

**How to apply:**
- Preserve the linked `extra.eas.projectId`; do not create a replacement project just to bypass access errors.
- When EAS identifies the project owner and asks for an `expo.owner`, set it to that exact account name.
- Log out of Expo, log back in to the individual Expo user that has membership access to the owner account, and confirm with `npx expo whoami` before any EAS build or EAS init.
- If Expo Launch still returns `EXPO_UNAUTHORIZED` before a workflow begins after the correct account connection is restored, use Replit's Project Editor `EAS init` recovery flow.
- A workspace `EXPO_TOKEN` can authenticate direct EAS commands but does not by itself repair a stale Replit Expo Launch service connection. If direct EAS access is verified and Launch remains unauthorized before any workflow exists, the Launch connection needs a Replit-side repair.
