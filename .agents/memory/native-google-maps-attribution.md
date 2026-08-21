---
name: Native Google Maps attribution
description: Why native map attribution must remain provider-controlled in INNDOS.
---

Do not hide, recolor, replace, crop, or cover the Google Maps attribution rendered by the native SDK. Its text, color, and placement remain provider-controlled.

**Why:** Google requires visible attribution, and react-native-maps does not expose a supported control for styling the native Google watermark.

**How to apply:** When adjusting INNDOS map layouts or themes, preserve the SDK attribution area. Explain the constraint if a request asks to remove the Google wording or force it to a specific color.