import fs from 'fs';

const path = 'client/src/pages/AddListing.tsx';
let content = fs.readFileSync(path, 'utf8');

const pathBnb = 'client/src/pages/AddBNB.tsx';
let contentBnb = fs.existsSync(pathBnb) ? fs.readFileSync(pathBnb, 'utf8') : '';

// The user wants unit amenities and premise amenities.
// Let's check if AddListing.tsx has amenities.
const amenityRegex = /const AMENITIES = \[[^\]]+\];/;
const newAmenities = `const UNIT_AMENITIES = [
  { id: "instant_shower", label: "Instant shower" },
  { id: "study_desk", label: "Study desk" },
  { id: "safe", label: "Safe" },
  { id: "babycot", label: "Baby court" },
  { id: "housekeeping", label: "Daily housekeeping" },
  { id: "private_chef", label: "Private chef (additional)" },
  { id: "hairdryer", label: "Hair dryer" },
  { id: "ironbox", label: "Iron box" },
  { id: "wifi", label: "WiFi" },
  { id: "laundry", label: "Laundry area" },
  { id: "balcony", label: "Balcony" },
  { id: "ac", label: "Air conditioner" },
  { id: "smoker_alert", label: "Smoker alerts" },
  { id: "fridge", label: "Fridge" },
  { id: "microwave", label: "Microwave" },
  { id: "dishwasher", label: "Dishwasher" },
  { id: "coffee", label: "Coffee maker/kettle" },
  { id: "smart_tv", label: "Smart TV" },
  { id: "smoking_allowed", label: "Smoking allowed" },
  { id: "no_smoking", label: "Smoking not allowed" },
  { id: "self_locking", label: "Self locking/keylocker" }
];

const PREMISE_AMENITIES = [
  { id: "gym", label: "Gym" },
  { id: "borewater", label: "Borehole water" },
  { id: "garden", label: "Garden" },
  { id: "cctv", label: "CCTV" },
  { id: "parking", label: "Parking" },
  { id: "security", label: "24/7 security" },
  { id: "elevator", label: "Elevator" },
  { id: "electric_fence", label: "Electric fence" },
  { id: "solar", label: "Solar water heating" },
  { id: "pool", label: "Swimming pool" },
  { id: "smoking_area", label: "Smoking area" },
  { id: "generator", label: "Backup generator" },
  { id: "pet_friendly", label: "Pet friendly" },
  { id: "dsq", label: "DSQ" }
];`;

if (content.includes('const AMENITIES')) {
    content = content.replace(amenityRegex, newAmenities);
    
    // Replace rendering of amenities
    const renderAmenitiesRegex = /<div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;
    
    const newRenderAmenities = `<div className="space-y-6 mt-4">
                        <div>
                          <h4 className="text-sm font-semibold mb-3">Unit Amenities</h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {UNIT_AMENITIES.map((amenity) => (
                              <div key={amenity.id} className="flex items-center space-x-2">
                                <Checkbox id={\`unit-\${amenity.id}\`} />
                                <Label htmlFor={\`unit-\${amenity.id}\`} className="text-sm cursor-pointer">{amenity.label}</Label>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold mb-3">Premise Amenities</h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {PREMISE_AMENITIES.map((amenity) => (
                              <div key={amenity.id} className="flex items-center space-x-2">
                                <Checkbox id={\`premise-\${amenity.id}\`} />
                                <Label htmlFor={\`premise-\${amenity.id}\`} className="text-sm cursor-pointer">{amenity.label}</Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>`;
                  
    content = content.replace(renderAmenitiesRegex, newRenderAmenities);
    fs.writeFileSync(path, content);
    console.log("Updated AddListing.tsx amenities");
} else {
    console.log("AddListing doesn't have AMENITIES constant. Checking AddBNB.");
    if (contentBnb.includes('const AMENITIES')) {
        contentBnb = contentBnb.replace(amenityRegex, newAmenities);
        const renderAmenitiesRegexBnb = /<div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">[\s\S]*?<\/div>\s*<\/CardContent>/;
        
        const newRenderAmenitiesBnb = `<div className="space-y-6 mt-4">
                        <div>
                          <h4 className="text-sm font-semibold mb-3">Unit Amenities</h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {UNIT_AMENITIES.map((amenity) => (
                              <div key={amenity.id} className="flex items-center space-x-2">
                                <Checkbox id={\`unit-\${amenity.id}\`} />
                                <Label htmlFor={\`unit-\${amenity.id}\`} className="text-sm cursor-pointer">{amenity.label}</Label>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold mb-3">Premise Amenities</h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {PREMISE_AMENITIES.map((amenity) => (
                              <div key={amenity.id} className="flex items-center space-x-2">
                                <Checkbox id={\`premise-\${amenity.id}\`} />
                                <Label htmlFor={\`premise-\${amenity.id}\`} className="text-sm cursor-pointer">{amenity.label}</Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>`;
                    
        contentBnb = contentBnb.replace(renderAmenitiesRegexBnb, newRenderAmenitiesBnb);
        fs.writeFileSync(pathBnb, contentBnb);
        console.log("Updated AddBNB.tsx amenities");
    }
}
