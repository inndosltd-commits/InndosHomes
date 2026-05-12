import fs from 'fs';

const pathDashboard = 'client/src/pages/Dashboard.tsx';
const dashboardContent = fs.readFileSync(pathDashboard, 'utf8');

// Find the line with Welcome back
const lines = dashboardContent.split('\n');
const lineIndex = lines.findIndex(l => l.includes('Welcome back,'));

if (lineIndex !== -1) {
    console.log("Lines around Welcome back:");
    for(let i=Math.max(0, lineIndex-5); i<=Math.min(lines.length-1, lineIndex+10); i++) {
        console.log(`${i+1}: ${lines[i]}`);
    }
}
