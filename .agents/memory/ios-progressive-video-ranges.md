---
name: iOS progressive video ranges
description: HTTP requirements for reliable native iOS playback of object-storage videos through an application proxy.
---

Object-storage proxies serving progressive videos must support single HTTP byte ranges and return `206 Partial Content`, `Accept-Ranges`, `Content-Range`, and the partial `Content-Length`.

**Why:** Native iOS AVPlayer may reject a valid, fast-start MP4 when an application proxy always responds with the entire object, even though Android players and web browsers still play it.

**How to apply:** Whenever listing videos are served through an API storage route rather than a direct object URL, preserve byte-range semantics all the way to the backing object stream. Validate the route with a small `Range: bytes=0-N` request.