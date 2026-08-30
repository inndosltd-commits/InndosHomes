---
name: Expo tab scroll events
description: Compatibility guidance for responding to tab presses in the Expo Router mobile artifact.
---

The mobile artifact can use the navigation object returned by Expo Router to listen for `tabPress`, but importing React Navigation directly may fail because it is not a declared package dependency.

**Why:** The runtime navigator emits tab events through Expo Router, while the package type surface may not expose the tab-specific event map.

**How to apply:** Use `useNavigation` from `expo-router`, attach the listener in an effect, and keep the type assertion limited to the `tabPress` event rather than adding a redundant direct dependency.