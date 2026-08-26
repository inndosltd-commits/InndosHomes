---
name: Subscription payment binding
description: Security rules for activating paid subscriptions from verified online payments or audited offline payments.
---

Online paid subscriptions must be created only from a gateway result bound to the exact pending payment by tracking ID, merchant reference, amount, and currency. Derive plan and duration only from the stored payment record, never callback query parameters. Claim pending payments atomically before creating a subscription so callback and notification races remain idempotent.

An admin may activate a paid plan after receiving money offline only through the dedicated offline-payment path. That path must create an explicit completed payment record with the offline method, unique receipt/reference, amount, plan, duration, and admin attribution, then atomically link it to the resulting subscription. Offline records must never satisfy gateway callback or IPN matching.

All subscription replacements must serialize per user, and the database must enforce at most one active subscription per user.

**Why:** A client-visible manual activation route, loosely bound gateway callbacks, or concurrent admin/gateway completions can activate an unpaid order or leave multiple active plans with nondeterministic entitlements. Offline payments are legitimate only when their audit evidence is preserved.

**How to apply:** Keep online activation behind checkout plus verified callback/IPN or verified status reconciliation. Keep offline activation behind the admin-only audited payment flow. Direct paid-plan assignment, reactivation, conversion, or extension remains prohibited. Admins may cancel or move users to Free.