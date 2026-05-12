import fs from 'fs';

const path = 'client/src/components/layout/Navbar.tsx';
let content = fs.readFileSync(path, 'utf8');

// The user issue: "when you click to switch to another language on mobile says link copied. when you swich new currency now working too..it opens a certain pproperty on mobile"
// This indicates that the clicks on the mobile menu are falling through to the elements underneath it (like the Share button which copies the link, or the PropertyCard which opens a property).

// The mobile menu wrapper is:
// <div className="lg:hidden border-t bg-white absolute top-20 left-0 w-full shadow-2xl flex flex-col p-4 gap-4 z-[90]">
// BUT if it doesn't have a min-height or something, maybe the user is clicking on the Selects but the dropdown is extending past the menu, and the clicks on the options are hitting the elements below?
// Wait, now that we changed it to a native <select>, clicking the native select options is handled by the OS. 
// However, the native <select> on iOS opens a bottom sheet or wheel picker.
// BUT the issue described ("says link copied") might be happening when they click the Select component ITSELF, before the options open?
// Or maybe the menu is over the page content, but touches are passing through?
// We should add `pointer-events-auto` to the menu container, or ensure that it prevents event bubbling.
// Also, the menu is missing `min-h-screen` or similar, so it only covers part of the screen.

// Actually, wait. When they click the Language select, they might be tapping on the background of the menu, but if the menu doesn't prevent propagation, or if it's a z-index issue.
// Let's add `pointer-events-auto` to the menu div.
// Also, let's wrap the mobile menu in an overlay background (a backdrop) to prevent clicks from falling through to the rest of the page.
// The overlay will have `fixed inset-0 top-20 bg-white z-[90] overflow-y-auto pb-24`

const oldMenu = `{/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t bg-white absolute top-20 left-0 w-full shadow-2xl flex flex-col p-4 gap-4 z-[90]">`;

const newMenu = `{/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-20 bg-white z-[90] overflow-y-auto pb-24 border-t shadow-2xl flex flex-col p-4 gap-4 pointer-events-auto">`;

if (content.includes(oldMenu)) {
    content = content.replace(oldMenu, newMenu);
    fs.writeFileSync(path, content);
    console.log("Added full screen overlay for mobile menu to prevent click fall-through.");
} else {
    console.log("Could not find mobile menu wrapper to replace.");
}

