import fs from 'fs';

const path = 'client/src/pages/Home.tsx';
let content = fs.readFileSync(path, 'utf8');

// After removing the filter pills, let's make sure the remaining "List Property" and search bar are styled correctly.
// Currently it might be justified to the right because of "ml-auto".
// Let's remove "ml-auto" if it exists so they look centered or at least properly aligned if they are the only things left in that bar.

const rightSideRegex = /\{\/\*\s*Right Side: List Property & Search Bar\s*\*\/\}\s*<div className="flex w-full md:w-auto items-center gap-3 ml-auto">/;
if (rightSideRegex.test(content)) {
    // If it's the only thing in the bar, we should probably justify it to flex-end or let it fill.
    // Let's just check how it looks. If it's alone in a flex container with justify-between, ml-auto pushes it right.
    content = content.replace(rightSideRegex, `{/* Right Side: List Property & Search Bar */}\n                 <div className="flex w-full items-center justify-end gap-3">`);
    fs.writeFileSync(path, content);
    console.log("Updated alignment for the remaining search bar");
} else {
    console.log("Right side regex didn't match.");
}
