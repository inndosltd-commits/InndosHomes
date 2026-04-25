import fs from 'fs';

const path = 'client/src/pages/Login.tsx';
let content = fs.readFileSync(path, 'utf8');

// Fix uncontrolled input issue by adding a key to the container based on isSignUp
// This forces React to recreate the inputs when toggling, so they get the correct defaultValue
content = content.replace(
  /<div className="space-y-4">/g,
  `<div className="space-y-4" key={isSignUp ? "signup" : "login"}>`
);

// We also need to clear inputs explicitly when toggling just in case, but key should be enough.
fs.writeFileSync(path, content);
console.log('Fixed Login.tsx defaultValue issue');
