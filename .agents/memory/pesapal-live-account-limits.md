---
name: PesaPal live account limits
description: Provider responses that look like sandbox failures can come from a live merchant account restriction.
---

PesaPal may return `TEST_TRANSACTIONS_EXCEEDED` or `contractual_error` / `amount_exceeds_default_limit` from the production endpoint even when the application is configured for Live. These indicate that PesaPal has classified the merchant account as test-limited, not fully activated, or below the submitted amount limit.

**Why:** INNDOS used the documented production API URL and submitted correct KES amounts, while PesaPal returned both test-limit and contractual amount-limit errors after credentials were changed. The public IPN route was reachable; PesaPal separately returned HTTP 500 during IPN registration.

**How to apply:** Verify the selected gateway URL, mode, and credential-scoped token first. Then treat these codes as provider-side blockers: do not lower or split subscription charges, do not retry rejected orders, and ask PesaPal to activate/reset the merchant account, raise its default limit, or issue unrestricted production credentials. Keep IPN IDs scoped to the credential signature so switching away and back does not require re-registration; allow an administrator to restore a known existing IPN ID when the provider registration endpoint fails.