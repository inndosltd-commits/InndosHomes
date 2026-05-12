import fs from 'fs';

const path = 'client/src/components/layout/Navbar.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
    'onChange={(e) => setLanguage(e.target.value)}',
    'onChange={(e) => setLanguage(e.target.value as any)}'
);

content = content.replace(
    'onChange={(e) => setCurrency(e.target.value)}',
    'onChange={(e) => setCurrency(e.target.value as any)}'
);

fs.writeFileSync(path, content);
console.log("Fixed typescript errors in Navbar");
