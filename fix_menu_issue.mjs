import fs from 'fs';

const path = 'client/src/components/layout/Navbar.tsx';
let content = fs.readFileSync(path, 'utf8');

// Looking at the user's screenshot closely...
// The "Rent" text is clicked, and a dropdown appears UNDER it, but it looks like a white card with rounded corners, and it has shadow.
// Wait, the "Rent" section in my mobile menu IS just a simple list:
// `<div className="pl-4 mt-3 flex flex-col gap-3 border-l-2 border-primary/20 ml-2">`
// So why does it look like a floating white card in the screenshot?
// Ah! In the screenshot, the top menu is horizontal!
// Wait! Is there a horizontal scrolling categories menu?
// "the propery is the way when you click the through horinzal menu icon it opens... it looks funny... not standand way."
// Ah! The user is talking about the "Rent" link in the DESKTOP navbar!
// Look at the screenshot! The logo is on the left. The notification bell and hamburger menu are on the right.
// AND BELOW IT, there is a horizontal bar with "B&B", "Rent" ...
// Wait! The user must be scrolling down, and the mobile menu is open, but it's rendering WEIRDLY.
// Let's look at the mobile menu code again.
// `<div className="lg:hidden fixed inset-0 top-20 bg-white z-[90] overflow-y-auto pb-24 border-t shadow-2xl flex flex-col p-4 gap-4 pointer-events-auto" ...>`
// The background is `bg-white`. The height should cover the screen because of `inset-0 top-20`.
// If `inset-0` is used, it sets top:0, right:0, bottom:0, left:0.
// But we also have `top-20`. So it's from 80px down to the bottom.
// In the screenshot, the white background is CUT OFF right below "Business Spaces" / "Godowns"!
// Why would the white background be cut off?
// Maybe the container is not actually taking full height?
// Let's change `inset-0 top-20` to `top-20 left-0 w-full h-[calc(100vh-5rem)] bg-white`.
// Or maybe `h-screen`.

const oldMenuContainer = `className="lg:hidden fixed inset-0 top-20 bg-white z-[90] overflow-y-auto pb-24 border-t shadow-2xl flex flex-col p-4 gap-4 pointer-events-auto"`;
const newMenuContainer = `className="lg:hidden fixed top-20 left-0 w-full h-[calc(100vh-5rem)] bg-white z-[90] overflow-y-auto pb-24 border-t shadow-2xl flex flex-col p-4 gap-4 pointer-events-auto"`;

if (content.includes(oldMenuContainer)) {
    content = content.replace(oldMenuContainer, newMenuContainer);
    fs.writeFileSync(path, content);
    console.log("Fixed mobile menu background cutoff");
} else {
    console.log("Could not find mobile menu container");
}
