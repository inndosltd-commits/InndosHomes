---
name: PesaPal callback origin
description: Public callback and IPN requirements for PesaPal checkout in proxied and mobile clients.
---

PesaPal callback and IPN URLs must be built from the canonical public application origin, not the incoming request host. A stored IPN registration is also environment-specific, so changing credentials or sandbox/live mode must invalidate it before the next checkout.

PesaPal can return HTTP 200 for a rejected order. Checkout is successful only when the response contains both a redirect URL and an order tracking ID. If the response rejects a stale notification/IPN ID, register a fresh IPN and retry the order once.

**Why:** Mobile and proxied requests can expose internal or development hosts that PesaPal cannot reach, while an IPN ID registered in the other gateway environment can make an otherwise valid checkout fail. Treating a body-level rejection as success creates pending payments that can never be reconciled.

**How to apply:** Keep the origin configurable for deployment overrides with the canonical website URL as the safe default; clear and re-register the IPN whenever PesaPal credentials or mode changes. Validate required response fields even on HTTP 200.