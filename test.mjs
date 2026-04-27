import fs from 'fs';

const path = 'client/src/pages/PropertyDetails.tsx';
let content = fs.readFileSync(path, 'utf8');

// The issue from the user's screenshot is that the text "Garden Flat in Lavington" is partially overlapping the image in mobile view. 
// AND the stats row is not aligned.

// In my previous changes, I moved the Title block to the flex-1 container mx-auto px-4 py-8.
// I also modified the stats row so it has the share/favorite buttons side-by-side with the stats.
// Let's make sure the Title is definitely NOT overlapping the image by adding mt-4 to the title container.

const oldTitleContainer = `<div className="flex flex-col lg:flex-row justify-between items-start mb-6 gap-4">`;
const newTitleContainer = `<div className="flex flex-col lg:flex-row justify-between items-start mb-6 gap-4 mt-2 sm:mt-0">`;

if (content.includes(oldTitleContainer)) {
    content = content.replace(oldTitleContainer, newTitleContainer);
    fs.writeFileSync(path, content);
    console.log("Added top margin to title container");
}
