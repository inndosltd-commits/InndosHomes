---
name: Subscription payment binding
description: Security rules for activating paid subscriptions from payment-gateway callbacks and notifications.
---

Paid subscriptions must be created only from a gateway result bound to the exact pending payment by tracking ID, merchant reference, and amount. Derive plan and duration only from the stored payment record, never callback query parameters. Claim pending payments atomically before creating a subscription so callback and notification races remain idempotent.

**Why:** A client-visible manual activation route and loosely bound gateway callbacks can let an unpaid or different completed order activate a paid plan.

**How to apply:** Keep customer-facing paid activation behind checkout and verified callback/IPN processing. Explicit plan assignment may remain available only through authenticated admin operations.