import fs from 'fs';

const path = 'client/src/pages/Home.tsx';
let content = fs.readFileSync(path, 'utf8');

// The issue "it opens new tab and releads forever" usually happens when an input is inside a form and pressing Enter submits the form, or there's some Link wrapper that's being clicked by mistake, or there's a hydration loop.
// Let's check the structure around the search bar.

const searchContextRegex = /<div className="absolute top-6 left-1\/2 -translate-x-1\/2 z-\[400\] w-\[90%\] max-w-xl pointer-events-none">[\s\S]*?<\/div>\s*<\/div>\s*<div className="absolute inset-0 z-0">/;
const match = content.match(searchContextRegex);
if (match) {
    console.log("Found search section");
    
    // There is no form wrapper in what I added, but maybe it's inside a larger element or the map itself is intercepting events.
    // Actually, "opens new tab and reloads forever" sounds like it's inside a <a href> or <Link> tag somehow, OR it's a <form> without e.preventDefault().
    
    // Wait! Let's check if the search bar is somehow wrapped in a <Link>.
    // Let's print out the surrounding lines.
    const index = content.indexOf('Floating Search Bar');
    console.log(content.substring(Math.max(0, index - 500), index + 1000));
} else {
    console.log("Could not find search block");
}
