---
name: CMS template migrations
description: Safe rollout rules for replacing generic CMS seed documents with page-specific templates.
---

CMS template migrations must identify the exact untouched legacy seed shape before replacing a draft. A missing template marker alone is not evidence that a document is safe to overwrite.

**Why:** CMS regression coverage uses intentionally authored documents that may predate the marker. Broad upgrades silently replaced those drafts and broke save/publish assertions.

**How to apply:** Add version/template metadata to new defaults, but only upgrade existing rows when their content still matches the known generic seed. Preserve authored drafts and published content; let developers explicitly choose the new template when content has diverged.