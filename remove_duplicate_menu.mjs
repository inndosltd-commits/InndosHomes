import fs from 'fs';

const path = 'client/src/pages/Home.tsx';
let content = fs.readFileSync(path, 'utf8');

// Find the Filter Pills section
const filterPillsRegex = /\s*\{\/\*\s*Filter Pills - Scrollable on mobile\s*\*\/\}\s*<div className="w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0 flex-shrink-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>[\s\S]*?<\/div>\s*<\/div>\s*/;

if (filterPillsRegex.test(content)) {
    content = content.replace(filterPillsRegex, '\n                 ');
    fs.writeFileSync(path, content);
    console.log("Successfully removed the repeating menu buttons.");
} else {
    console.log("Regex didn't match. Searching for alternative string.");
}
