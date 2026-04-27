import fs from 'fs';

const path = 'client/src/pages/PropertyDetails.tsx';
let content = fs.readFileSync(path, 'utf8');

// The screenshot shows:
// - Title: "Garden Flat in Lavington" (in bold black) overlaid on a light part of the image, or perhaps the image is supposed to be above it?
// Wait, looking at the screenshot carefully:
// 1. Navbar is at the very top.
// 2. Below that, a full-width image grid.
// 3. Below the image grid, the property title "Garden Flat in Lavington" is in bold black text on a white background. Wait, no.
// Ah, the screenshot shows the title is actually PART OF the white content area BELOW the images.
// Wait, the blue arrow in the screenshot points from the top navbar's notification bell down to the image, and then points to the Title which is currently overlapping the image.
// No, the blue arrow points from the image "Garden Flat in Lavington" which is OVERLAID on the image with a black gradient.
// In my code, the title is currently NOT overlaid on the image, it's in the text section. Wait!
// Did I miss something? 
// The screenshot shows the title IS overlaid on the image in the grid, but the text is black and hard to read.
// Let's check the code:

// The screenshot shows a 2-column grid.
// The left column has the main image. At the bottom of the left column image, there's a dark gradient and white text. But wait, in the screenshot, the text "Garden Flat in Lavington" is BLACK. And the gradient is missing or white?
// Let's read the PropertyCard component, maybe that's what the screenshot is of?
// NO, the screenshot has "1400 SQ FT" and a Share icon next to it, and a "Description" section below. This is definitely PropertyDetails.

// In PropertyDetails.tsx, the title was moved to the white content area in my previous fix.
// Let's check how the Title section looks now in the code.
// The title is in the <div className="flex-1 container mx-auto px-4 py-8"> section. This means it is on a white background.
// If it is on a white background, it will be perfectly readable.

// Let's check the share icon in the screenshot. It's next to "1400 SQ FT".
// The share button is a square outline button with a share icon inside.
// In my code, I added:
// <div className="sm:hidden absolute -right-2 top-0 flex gap-1">
//    <Button variant="outline" size="icon" className="h-7 w-7 rounded-full bg-white shadow-sm" ...

// Let's make it a square button, and exactly like the screenshot.
const oldButton = `<div className="sm:hidden absolute -right-2 top-0 flex gap-1">
                          <Button variant="outline" size="icon" className="h-7 w-7 rounded-full bg-white shadow-sm" onClick={handleShare} title="Share Property">
                            <Share2 className="h-3 w-3" />
                          </Button>
                       </div>`;

const newButton = `<div className="sm:hidden absolute -right-8 -top-1 flex gap-1">
                          <Button variant="outline" size="icon" className="h-8 w-8 rounded-md border-gray-300 bg-white" onClick={handleShare} title="Share Property">
                            <Share2 className="h-4 w-4 text-gray-700" />
                          </Button>
                       </div>`;

if (content.includes(oldButton)) {
    content = content.replace(oldButton, newButton);
    fs.writeFileSync(path, content);
    console.log("Updated Share button");
}

