import fs from 'fs';

const path = 'client/src/pages/AddBNB.tsx';
const path2 = 'client/src/pages/AddListing.tsx';

let content = fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
let content2 = fs.readFileSync(path2, 'utf8');

const bnbRegex = /<SelectItem value="bnb">BnB \(Short Term\)<\/SelectItem>/;
const newBnbOpts = `<SelectItem value="bnb-single">BnB (Single Room)</SelectItem>
                          <SelectItem value="bnb-double">BnB (Double Room)</SelectItem>
                          <SelectItem value="bnb-1bed">BnB (1 Bedroom)</SelectItem>
                          <SelectItem value="bnb-2bed">BnB (2 Bedrooms)</SelectItem>
                          <SelectItem value="bnb-3bed">BnB (3 Bedrooms)</SelectItem>
                          <SelectItem value="bnb-studio">BnB (Studio)</SelectItem>
                          <SelectItem value="bnb-house">BnB (Entire House/Villa)</SelectItem>`;

if (content2.includes('<SelectItem value="bnb">BnB (Short Term)</SelectItem>')) {
    content2 = content2.replace(bnbRegex, newBnbOpts);
    fs.writeFileSync(path2, content2);
    console.log("Updated BnB options in AddListing");
}

if (content && content.includes('<SelectItem value="bnb">BnB (Short Term)</SelectItem>')) {
    content = content.replace(bnbRegex, newBnbOpts);
    fs.writeFileSync(path, content);
    console.log("Updated BnB options in AddBNB");
}

