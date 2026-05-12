import fs from 'fs';

const path = 'client/src/components/layout/Navbar.tsx';
let content = fs.readFileSync(path, 'utf8');

// The issue: "when you click a new language or new currency on mobile still doesnt switch"
// Looking at the code:
// <Select value={language} onValueChange={(v: any) => { setLanguage(v); setIsMobileMenuOpen(false); }}>
// If setIsMobileMenuOpen(false) is called inside onValueChange, it closes the menu but maybe the Select component state gets unmounted before the context fully updates? Or maybe the radix portal is closing immediately because the parent menu closes?
// Actually, I already added a fix previously to prevent the menu from closing when clicking INSIDE the portal.
// Wait, the previous fix:
// if (target.closest('[data-radix-portal]')) { return; }
// That prevents handleClickOutside from closing the menu when clicking the select options.
// BUT in the mobile menu, the onValueChange handler EXPLICITLY calls setIsMobileMenuOpen(false):
// onValueChange={(v: any) => { setLanguage(v); setIsMobileMenuOpen(false); }}

// If we call setLanguage(v) and IMMEDIATELY unmount the menu (setIsMobileMenuOpen(false)), maybe the state update is interrupted or the Select component throws an error when it unmounts while handling the change event?
// Let's wrap setIsMobileMenuOpen(false) in a setTimeout so the state update can complete, or just remove setIsMobileMenuOpen(false) so the user has to close the menu manually, which is safer.
// Actually, standard behavior for dropdowns in mobile menus is they don't necessarily close the whole menu when you change a setting like language/currency, or if they do, a slight delay helps.
// Let's just remove `setIsMobileMenuOpen(false)` from the language and currency selects so it just updates and stays open. The user can see it updated and then close the menu.

const oldLang = `onValueChange={(v: any) => { setLanguage(v); setIsMobileMenuOpen(false); }}`;
const newLang = `onValueChange={(v: any) => setLanguage(v)}`;

const oldCurr = `onValueChange={(v: any) => { setCurrency(v); setIsMobileMenuOpen(false); }}`;
const newCurr = `onValueChange={(v: any) => setCurrency(v)}`;

if (content.includes(oldLang)) {
    content = content.replace(oldLang, newLang);
    console.log("Fixed language select");
}
if (content.includes(oldCurr)) {
    content = content.replace(oldCurr, newCurr);
    console.log("Fixed currency select");
}

fs.writeFileSync(path, content);
