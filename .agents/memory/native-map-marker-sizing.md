---
name: Native map marker sizing
description: Prevent oversized property pins in react-native-maps on iOS.
---

Do not pass the property pin asset through the `Marker` image prop when its source bitmap is larger than the intended on-map pin. Render it as a fixed-size child image with an explicit anchor.

**Why:** iOS can honor the bitmap's intrinsic dimensions for the marker image prop, producing a screen-sized pin and creating unnecessary native rendering pressure.

**How to apply:** For custom map markers, constrain the child image dimensions and keep marker view tracking disabled once the image is rendered.