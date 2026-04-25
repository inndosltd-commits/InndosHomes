import fs from 'fs';

const path = 'client/src/pages/Dashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

// Update Analytics & Reports tab value to match what might be expected or fix it if it's missing
// I will check what the value is first.
console.log('Finding TabsTrigger for Analytics');
const match = content.match(/<TabsTrigger value="([^"]+)">\s*<BarChart3 className="w-4 h-4 mr-2" \/>\s*Analytics/);
if (match) {
    console.log('Analytics tab value is:', match[1]);
} else {
    console.log('Analytics tab not found with that pattern');
}
