import fs from 'fs';

const path = 'client/src/components/layout/Navbar.tsx';
let content = fs.readFileSync(path, 'utf8');

// There is another problem that can happen: scrolling the window while the mobile menu is open might close it immediately on mobile, or 
// opening a Select dropdown might trigger a scroll event and close the menu.

const oldScrollListener = `    function handleScroll() {
      if (isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    }`;

// Let's modify handleScroll to be less aggressive. If a select is open, we don't want to close the menu.
// Better yet, just remove the scroll listener closing the mobile menu. It's very annoying on mobile devices when the address bar hides/shows and triggers a scroll, closing the menu.

const newScrollListener = `    // function handleScroll() {
    //   if (isMobileMenuOpen) {
    //     setIsMobileMenuOpen(false);
    //   }
    // }`;

const listenerAttachmentOld = `window.addEventListener("scroll", handleScroll, { passive: true });`;
const listenerAttachmentNew = `// window.addEventListener("scroll", handleScroll, { passive: true });`;

const listenerDetachmentOld = `window.removeEventListener("scroll", handleScroll);`;
const listenerDetachmentNew = `// window.removeEventListener("scroll", handleScroll);`;

if (content.includes(oldScrollListener)) {
    content = content.replace(oldScrollListener, newScrollListener);
    content = content.replace(listenerAttachmentOld, listenerAttachmentNew);
    content = content.replace(listenerDetachmentOld, listenerDetachmentNew);
    fs.writeFileSync(path, content);
    console.log("Fixed handleScroll issue.");
} else {
    console.log("Could not find old scroll listener.");
}
