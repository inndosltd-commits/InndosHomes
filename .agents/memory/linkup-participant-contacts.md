---
name: Link-Up participant contacts
description: Privacy and cross-role visibility rules for Link-Up participant details.
---

Once a Link-Up exists, its customer and property lister can see each other's name and contact details. The lister's brand/business name, Link-Up creation date, and linked property navigation should appear on both participant surfaces.

**Why:** Link-Ups are immediate enquiries intended to let both parties communicate directly. Owner and host accounts may also act as customers on another lister's property, so role-only UI branching can incorrectly hide their sent Link-Ups.

**How to apply:** Authorize and display Link-Ups by relationship: booking creator for sent records and property owner for received records. Show both sets for lister accounts, deduplicate them, and never expose participant contacts to unrelated users or public property queries.