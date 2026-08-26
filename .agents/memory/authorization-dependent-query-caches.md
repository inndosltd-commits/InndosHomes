---
name: Authorization-dependent query caches
description: How to cache API responses whose fields vary according to the authenticated caller.
---

Cache keys for authorization-dependent responses must include the current user identity, including an explicit signed-out identity. After a mutation changes authorization, refresh that exact user-scoped response before relying on newly protected fields.

**Why:** A shared resource-only cache key can disclose protected fields from one account to another, while a stale pre-authorization response can hide fields a newly authorized user should receive.

**How to apply:** Use this rule whenever the same endpoint conditionally includes fields based on ownership, role, membership, booking, or another caller-specific relationship. Keep the server as the source of authorization truth.