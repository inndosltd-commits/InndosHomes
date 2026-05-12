import fs from 'fs';

const path = 'client/src/pages/PropertyDetails.tsx';
let content = fs.readFileSync(path, 'utf8');

// Looking at the screenshot, it's the PropertyDetails page.
// The title is overlaid on the image, making it hard to read ("Garden Flat in Lavington" in black text over a dark image).
// The share icon is floating off to the side in the stats row.

const headerSection = content.substring(content.indexOf('<div className="relative w-full h-[60vh] md:h-[70vh]">'), content.indexOf('          {/* Property Stats */}'));
console.log("Header section:");
console.log(headerSection);

const statsSection = content.substring(content.indexOf('          {/* Property Stats */}'), content.indexOf('          {/* Main Content Area */}'));
console.log("\nStats section:");
console.log(statsSection);

