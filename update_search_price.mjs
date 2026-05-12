import fs from 'fs';

const path = 'client/src/pages/Search.tsx';
let content = fs.readFileSync(path, 'utf8');

// I need to add a visible price range slider in Search.tsx if it doesn't exist, or make sure it's rendered for bnb, rent, hostels, buy.
// Let's check what filters exist.
if (!content.includes('Price Range')) {
    const filtersArea = /<h3 className="font-bold mb-3">\{t\('search\.amenities'\)\}<\/h3>/;
    const priceRangeHtml = `
            <div className="mb-6">
              <h3 className="font-bold mb-3">Price Range</h3>
              <div className="px-2">
                <Slider 
                  defaultValue={[0, 500000]} 
                  max={1000000} 
                  step={1000}
                  onValueChange={(val) => setPriceRange(val)}
                />
                <div className="flex justify-between mt-2 text-sm text-gray-600">
                  <span>KES {priceRange[0]?.toLocaleString()}</span>
                  <span>KES {priceRange[1]?.toLocaleString()}{priceRange[1] === 1000000 ? '+' : ''}</span>
                </div>
              </div>
            </div>
            `;
    
    content = content.replace(filtersArea, priceRangeHtml + '\n            <h3 className="font-bold mb-3">{t(\'search.amenities\')}</h3>');
    fs.writeFileSync(path, content);
    console.log("Added Price Range to Search.tsx");
} else {
    console.log("Price Range already exists.");
}

