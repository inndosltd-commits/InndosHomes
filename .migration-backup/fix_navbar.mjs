import fs from 'fs';

const path = 'client/src/components/layout/Navbar.tsx';
let content = fs.readFileSync(path, 'utf8');

// The issue reported is:
// "the propery is the way when you click the through horinzal menu icon it opens... it looks funny... not standand way. look attached"
// Let's look at the screenshot. 
// The screenshot shows the "Rent" section expanded in the mobile menu, but the items ("Business Spaces", "Godowns", etc.) are floating randomly, overlapping the map behind them.
// Ah, the shadow/background of the dropdown is missing or it's transparent, OR it's pushing the content down weirdly?
// Wait, the screenshot shows the mobile menu ONLY has a white background for the top part!
// The bottom part of the menu is completely transparent, showing the map underneath!
// Look at the screenshot:
// "Rent"
// "Business Spaces"
// "Godowns"
// And right under Godowns, the white background STOPS, and you can see the Map!
// Why does the white background stop? 
// Because the mobile menu container doesn't have a solid background all the way down, or it has a fixed height that it overflowed?
// Let's check the container:
// `<div className="lg:hidden fixed inset-0 top-20 bg-white z-[90] overflow-y-auto pb-24 border-t shadow-2xl flex flex-col p-4 gap-4 pointer-events-auto" onClick={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()}>`
// Wait, if it has `inset-0 top-20 bg-white`, it SHOULD cover the whole screen.
// But in the screenshot, the white background has rounded corners at the bottom?? 
// "rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 py-2"
// Ah! The screenshot shows the DESKTOP dropdown menu on mobile?
// Or maybe the user didn't click the hamburger menu icon (the "Menu" button with the 3 lines). 
// Maybe the user clicked the "Rent" text directly in the horizontal scrolling menu (which doesn't exist? Oh wait, is there a horizontal menu?)
// The user said: "when you click the through horinzal menu icon it opens"
// Horizontal menu icon... the hamburger icon is 3 horizontal lines!
// The user clicked the hamburger icon. It opened the mobile menu.
// Then they clicked "Rent". It expanded the Rent submenu.
// BUT why is the background cutting off?

// Wait! Look at the screenshot again carefully.
// The "Rent" section has a white box behind it, with a shadow. It looks exactly like the absolute positioned dropdown from the DESKTOP menu!
// Wait! Does the desktop menu show up on mobile?
// Let's look at the desktop menu code:
// `<div className="hidden lg:flex items-center gap-6 xl:gap-8">`
// It is hidden on lg screens.
// BUT wait, is there a horizontal scrolling menu somewhere?
// The user says "when you click the through horinzal menu icon it opens".
// "horinzal menu icon" = horizontal menu icon = Hamburger menu (≡).
// The screenshot shows the mobile menu.
// Let's check the rent dropdown in the mobile menu:
// `<div className="pl-4 mt-3 flex flex-col gap-3 border-l-2 border-primary/20 ml-2 animate-in slide-in-from-top-2 duration-200">`
// That doesn't have a background.
// Why is the white background cutting off at "Godowns" in the screenshot?
// Ah! It's because the mobile menu container has `h-max` or something?
// Let's check the Navbar code again.
const navContent = fs.readFileSync('client/src/components/layout/Navbar.tsx', 'utf8');

// I also noticed in the logs:
// 10:32:14 AM [vite] Internal server error: /home/runner/workspace/client/src/components/layout/Navbar.tsx: Identifier 'ChevronDown' has already been declared. (3:60)
// This means the app crashed! 
// Let's make sure the import is fixed first.
if (navContent.includes('ChevronDown, ChevronDown')) {
    fs.writeFileSync('client/src/components/layout/Navbar.tsx', navContent.replace('ChevronDown, ChevronDown', 'ChevronDown'));
    console.log("Fixed duplicate import");
}

