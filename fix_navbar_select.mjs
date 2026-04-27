import fs from 'fs';

const path = 'client/src/components/layout/Navbar.tsx';
let content = fs.readFileSync(path, 'utf8');

// The Select components inside the mobile menu might be closing the menu when clicked or their items might be rendering behind the menu.
// In Radix/shadcn UI, SelectContent renders in a Portal by default, which appends it to document.body.
// Sometimes the z-index of the SelectContent is lower than the mobile menu z-index (which is z-[90]).
// Let's check the z-index of SelectContent in the ui component, but a simpler fix is to add z-[100] or simply not close the menu onClick on the SelectItem if that's happening.
// Actually, looking at the code:
// <Select value={language} onValueChange={(v: any) => { setLanguage(v); setIsMobileMenuOpen(false); }}>
// This seems correct, it closes the menu when a value is selected.
// What could be "not working"?
// 1. Maybe clicking the SelectTrigger closes the menu because of the click outside listener!
// The click outside listener in Navbar.tsx:
/*
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    }
*/
// Because SelectContent renders in a Portal (appended to document.body), clicking on an item inside SelectContent means clicking OUTSIDE of `menuRef.current` (which is the `<nav>` element).
// This causes `handleClickOutside` to fire and close the mobile menu immediately, often before the selection is processed, or it just abruptly closes the menu when you try to open the dropdown!
// Wait, clicking the trigger itself is inside the `<nav>`, so it opens the dropdown.
// But clicking the SelectItem is outside `<nav>`.
// Actually, even worse: SelectTrigger might be stopping propagation or something, but more likely, the Portal is the issue.

// Let's modify handleClickOutside to ignore clicks if they are inside a radix select content.
// A common way is to check if the event target is inside a radix portal.
const oldListener = `    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    }`;

const newListener = `    function handleClickOutside(event: MouseEvent | TouchEvent) {
      // Ignore clicks on Radix UI portals (like Select dropdowns)
      const target = event.target as Element;
      if (target.closest('[data-radix-portal]')) {
        return;
      }
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    }`;

if (content.includes(oldListener)) {
    content = content.replace(oldListener, newListener);
    fs.writeFileSync(path, content);
    console.log("Fixed handleClickOutside issue.");
} else {
    console.log("Could not find old listener.");
}
