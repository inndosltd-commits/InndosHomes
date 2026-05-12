import fs from 'fs';

const path = 'client/src/components/layout/Navbar.tsx';
let content = fs.readFileSync(path, 'utf8');

// Revert the backdrop overlay change if it caused issues. Let's see if the issue the user is reporting is the same as the original issue:
// "when you click the through horinzal menu icon it opens... it looks funny... not standand way. look attached"

// The user is saying "same problem has returned".
// What was the problem? "translating(footer not translating and when you open property the property content, details should be translated automaticaled too) and currency switing working too. the propery is the way when you click the through horinzal menu icon it opens... it looks funny... not standand way. look attached"

// Let's check `PropertyDetails.tsx` to make sure translations are working there.
