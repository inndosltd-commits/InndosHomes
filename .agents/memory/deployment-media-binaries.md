---
name: Deployment media binaries
description: Runtime dependency rule for server-side listing video verification and normalization.
---

Any server path that invokes FFmpeg or FFprobe must declare FFmpeg as an explicit Replit deployment dependency; finding the binaries in the development shell is not proof that they exist in the deployed runtime.

**Why:** Development video processing passed while the deployed autoscale runtime failed every valid upload with `spawn ffprobe ENOENT`.

**How to apply:** Keep FFmpeg in the project’s managed system dependencies and verify both binaries after dependency or deployment configuration changes. Before claiming cross-client video support, upload representative browser, Android, and iOS containers through the real presigned-upload and listing persistence flow, then probe the normalized output.