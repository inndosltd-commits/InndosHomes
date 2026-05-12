import fs from 'fs';

const path = 'client/src/pages/PropertyDetails.tsx';
let content = fs.readFileSync(path, 'utf8');

const imageGalleryOld = `<div className="grid grid-cols-1 md:grid-cols-2 h-[300px] md:h-[500px] gap-1">`;
const imageGalleryNew = `<div className="grid grid-cols-1 md:grid-cols-2 h-[250px] sm:h-[400px] md:h-[500px] gap-1">`;

if (content.includes(imageGalleryOld)) {
    content = content.replace(imageGalleryOld, imageGalleryNew);
    fs.writeFileSync(path, content);
    console.log("Adjusted image gallery height for mobile");
}
