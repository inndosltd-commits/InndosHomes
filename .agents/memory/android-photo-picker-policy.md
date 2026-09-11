---
name: Android system media picker
description: Google Play photo and video permission compliance for the Expo mobile app
---

Use Expo's system picker for photo and video selection instead of requesting broad media-library permissions. Keep Android media permissions blocked in app configuration and avoid adding a media-library module solely to save downloaded files; use the native share sheet for exported media.

**Why:** Google Play rejected the Android release because broad photo/video permissions were declared and requested even though upload flows only need user-selected assets.

**How to apply:** For future upload or document-photo flows, call the image picker's library launch directly and do not call media-library permission APIs. For downloads, share a local file or URL rather than writing directly to the photo library.