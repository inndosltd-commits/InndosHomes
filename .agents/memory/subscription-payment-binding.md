---
name: Subscription payment binding
description: Security rules for activating paid subscriptions from payment-gateway callbacks and notifications.
---

Paid subscriptions must be created only from a gateway result bound to the exact pending payment by tracking ID, merchant reference, and amount. Derive plan and duration only from the stored payment record, never callback query parameters. Claim pending payments atomically before creating a subscription so callback and notification races remain idempotent.

**Why:** A client-visible manual activation route and loosely bound gateway callbacks can let an unpaid or different completed order activate a paid plan.

**How to apply:** Keep every paid activation and paid-term extension behind checkout and verified callback/IPN processing, including admin tools. Admins may cancel paid subscriptions or move users to Free, but must not assign, reactivate, convert, or extend a paid plan without a completed bound payment.