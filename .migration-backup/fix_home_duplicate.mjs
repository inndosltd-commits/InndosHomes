import fs from 'fs';

const path = 'client/src/pages/Home.tsx';
let content = fs.readFileSync(path, 'utf8');

// I need to remove the secondary menu bar on the Home page that repeats B&B, Rent, Hostels, Hotels, Buy.
// In the screenshot, this bar has pill-shaped buttons for the categories and a "List Property" button and search bar.

const buttonBarRegex = /<div className="bg-white sticky top-20 z-40 border-b shadow-sm">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;

if (buttonBarRegex.test(content)) {
    // Let's replace the entire sticky bar with just the search part if needed, or remove the whole bar if the search is not needed here.
    // The screenshot shows: [ B&B ] [ Rent ] [ Hostels ] [ Hotels ] [ Buy ]      [ List Property ] [ Search locations ]
    // The user specifically asked to "remove that repeatation of menu B&B Rent Hostels Hotels Buy".
    
    // Let's just remove the buttons section but keep the search bar and List Property if they are in that bar.
    
    // Wait, the easiest way is to read the exact structure first.
    console.log(content.match(/<div className="bg-white sticky top-20 z-40 border-b shadow-sm">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/)[0].substring(0, 500));
} else {
    console.log("Could not find the sticky bar regex.");
}

