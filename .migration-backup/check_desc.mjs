import fs from 'fs';
const content = fs.readFileSync('client/src/pages/PropertyDetails.tsx', 'utf8');
if (content.includes("t('prop.dummy_desc')")) {
  console.log("Property Description translation is present.");
} else {
  console.log("Missing property description translation.");
}
