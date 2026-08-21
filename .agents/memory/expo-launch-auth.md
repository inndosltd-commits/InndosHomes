---
name: Expo Launch auth requirements
description: What causes EXPO_UNAUTHORIZED in Replit's Publishing panel and how to fix it.
---

## Rule
The `owner` field in `app.json` must exactly match the Expo account username (no typos). The `EXPO_TOKEN` Replit secret must be a personal access token generated from that same account.

**Why:** Replit's Publishing panel calls the Expo API using `EXPO_TOKEN`. If `owner` in `app.json` names a different account than the token's owner, Expo returns `EXPO_UNAUTHORIZED` even though the token itself is valid.

**How to apply:**
- Before any Expo Launch publish, verify `app.json` `owner` == the username shown at `expo.dev/accounts/<username>`.
- Generate `EXPO_TOKEN` from `expo.dev/accounts/<username>/settings/access-tokens`.
- Replit workspace secrets are NOT forwarded to remote EAS builds; EAS secrets must be set separately at expo.dev → Project → Secrets (e.g. `GOOGLE_API_KEY`).
