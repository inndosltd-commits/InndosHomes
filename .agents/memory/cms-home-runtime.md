---
name: CMS Home runtime composition
description: Home CMS sections must share the live search-filtered listing runtime while keeping component-specific content editable.
---

Home CMS rendering should use one shared runtime for map/search state and live property collections. Stable section IDs identify the product behavior, while component-specific copy, limits, actions, images, and visibility remain editable. The narrow editor preview should use preview-specific single-column layout rules; the public renderer keeps the full responsive grid.

**Why:** A generic CMS renderer caused the published Home page to drift from the real Home page and made search results inconsistent across sections.

**How to apply:** When adding or changing a Home block, preserve the live data source and shared filter context; add specialized editor controls instead of forcing the block through generic text/item fields. If the block is shown in the CMS sidebar, avoid relying on viewport media queries alone because the sidebar is narrower than the browser viewport.