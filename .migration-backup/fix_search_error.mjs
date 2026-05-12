import fs from 'fs';

const path = 'client/src/pages/Home.tsx';
let content = fs.readFileSync(path, 'utf8');

// The error was "p.location.toLowerCase is not a function" because p.location is an object { lat: number, lng: number } !
// Ah, the properties have an "address" field which is the string representation, not "location".
// p.location is an object for coordinates.
// So searching on `p.location.toLowerCase()` crashes the app and Vite's HMR reloads it.

content = content.replace(/p\.location\.toLowerCase/g, 'p.address.toLowerCase');

// Also update the dropdown render to show `p.address` instead of `p.location`
content = content.replace(/\{property\.location\}/g, '{property.address}');

fs.writeFileSync(path, content);
console.log("Fixed search error by using address instead of location object.");
