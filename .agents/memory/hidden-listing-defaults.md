---
name: Hidden listing defaults
description: Validation rule for listing-type-specific forms backed by shared required database columns.
---

When a listing type hides shared required columns, the API must provide that type's safe database defaults before schema validation.

**Why:** Land forms intentionally hide beds, baths, and square footage, but the shared property schema still requires numeric values. Omitting one hidden field produces an error users cannot see or correct.

**How to apply:** Keep type-specific UI validation focused on visible fields, then normalize hidden fields at the write boundary (land uses zero residential measurements) before calling the shared insert schema.