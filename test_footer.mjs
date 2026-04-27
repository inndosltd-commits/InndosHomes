import fs from 'fs';

const path = 'client/src/components/layout/Footer.tsx';
let content = fs.readFileSync(path, 'utf8');

if (content.includes('t("footer.platform")')) {
    console.log("Footer has translation tags.");
} else {
    console.log("Footer missing translation tags.");
}
