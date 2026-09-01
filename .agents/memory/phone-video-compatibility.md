---
name: Phone video compatibility
description: Reliable processing of videos captured by modern iOS and Android phones.
---

Phone-captured MOV/MP4 files can contain large metadata tables, irregular timestamps, recoverable packet warnings, HEVC, or variable-duration metadata. Video processing should use generous ffprobe analysis settings, tolerate recoverable probe warnings when valid JSON metadata is available, and transcode final clips to H.264, yuv420p, and fast-start MP4 for consistent browser and native playback.

**Why:** Native camera files are not uniformly encoded even when the phone player and browser can preview them. A strict metadata probe or timestamp-sensitive seek can reject a valid upload before the shared server transcoder runs.

**How to apply:** Keep listing-video normalization centralized in the API so web, iOS, and Android use the same validation and output format.