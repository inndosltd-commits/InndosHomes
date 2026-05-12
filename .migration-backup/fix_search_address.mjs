import fs from 'fs';

const path = 'client/src/pages/Home.tsx';
let content = fs.readFileSync(path, 'utf8');

// I also need to fix setSearchQuery(property.location) to setSearchQuery(property.address)
content = content.replace(/setSearchQuery\(property\.location\)/g, 'setSearchQuery(property.address)');

fs.writeFileSync(path, content);
console.log("Fixed setSearchQuery to use property.address");
