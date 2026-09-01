---
name: PesaPal callback origin
description: Public callback and IPN requirements for PesaPal checkout in proxied and mobile clients.
---

PesaPal callback and IPN URLs must be built from the canonical public application origin, not the incoming request host. A stored IPN registration is also environment-specific, so changing credentials or sandbox/live mode must invalidate it before the next checkout.

**Why:** Mobile and proxied requests can expose internal or development hosts that PesaPal cannot reach, while an IPN ID registered in the other gateway environment can make an otherwise valid checkout fail.

**How to apply:** Keep the origin configurable for deployment overrides with the canonical website URL as the safe default; clear and re-register the IPN whenever PesaPal credentials or mode changes.