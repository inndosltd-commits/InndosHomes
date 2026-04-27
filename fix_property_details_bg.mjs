import fs from 'fs';

const path = 'client/src/pages/PropertyDetails.tsx';
let content = fs.readFileSync(path, 'utf8');

// Looking closely at the user's screenshot again.
// The image has NO title overlay.
// Below the image, there is a WHITE background area.
// On this white background, it says:
// [Badge: For Rent] [Stars: 4.8 (24 reviews)]
// Garden Flat in Lavington (in bold black text)
// [Pin Icon] Lavington, Nairobi
// 
// Then there is a line separator.
// Then the stats row:
// 🛏️ 2 BEDROOMS | 🛁 2 BATHROOMS | 1400 SQ FT [Share Icon]

// My code currently has:
// <h1 className="text-3xl font-bold font-heading text-gray-900 mb-2">{property.title}</h1>
// Which is black text. 

// The user said: "the pointed title on screen shot in black...cant be seen well, as well not mobile responsive. too you see the part with share icon and favorite icon not mobile responsive"
// If the black text "can't be seen well", then it MUST BE OVERLAID on the image in their current view, and the screenshot is showing what they *want* it to look like?
// Or maybe the screenshot is what it currently looks like on their phone, but the arrow points to the text "Garden Flat in Lavington" which is actually OVERLAID on the bottom left corner of the top image in the grid?
// Ah! I see it now. 
// In the screenshot, there is text "Garden Flat in Lavington" OVERLAID on the image itself, AND ALSO it's written below?
// No, the text is ONLY overlaid on the image! The white area below the image starts with the Stats Row!
// Yes! Look at the screenshot again carefully.
// Top: Image of a bedroom.
// Bottom left of that image: "For Rent" badge, stars. Below that: "Garden Flat in Lavington" in black text over the carpet. Below that: pin icon "Lavington, Nairobi".
// Below the image grid: The white section starts immediately with the Stats row (BEDROOMS | BATHROOMS | SQ FT [Share]).
// The black text "Garden Flat in Lavington" on the carpet is very hard to read because the carpet is dark/gray.
// THAT is the problem!

// I need to change the PropertyDetails page so that the title and badges are NOT overlaid on the image, but instead are in the white section below the image, above the stats row.
// Wait, in my CURRENT code, I already moved the Title to the white section!
// Let's verify my current code.

const titleSection = content.substring(content.indexOf('          {/* Main Content */}'), content.indexOf('             <div className="flex flex-col sm:flex-row sm:items-center'));
console.log(titleSection);

