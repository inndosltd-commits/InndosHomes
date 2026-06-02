---
name: Dialog inside TabsContent trap
description: Radix UI TabsContent unmounts inactive tabs; Dialogs inside them won't open from other tabs.
---

## Rule
Never place a `<Dialog>` that can be triggered from *any* tab inside a specific `<TabsContent>`. Place it at the root `<Tabs>` level so it is always mounted.

**Why:** Radix UI `TabsContent` unmounts its children when not active (unless `forceMount` is set). A `Dialog` with `open={true}` inside an unmounted `TabsContent` simply never renders — the `onClick` that sets state fires fine, but the Dialog tree doesn't exist in the DOM.

**How to apply:** In Dashboard.tsx, keep all global dialogs at the very bottom of the main return at the `<Tabs>` root level — same indent as `<TabsContent>` siblings, not nested inside any one of them.
