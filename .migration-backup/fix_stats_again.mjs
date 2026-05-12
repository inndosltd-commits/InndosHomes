import fs from 'fs';

const path = 'client/src/pages/PropertyDetails.tsx';
let content = fs.readFileSync(path, 'utf8');

// I'll make the property stats completely wrap underneath the stats instead of pushing to the right side if it's too cramped,
// but the previous fix already changed it to flex-col on sm screens. Let's make sure the share/favorite are nicely positioned.

// Let's modify the Stats Row again to match the screenshot more closely.
// In the screenshot, the share button is RIGHT NEXT to the 1400 SQ FT.
// Let's put the share/favorite buttons in the same container or right after the stats, but in a way that doesn't break.

const oldStats = `<div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 sm:py-6 border-y border-gray-200 mb-8 gap-4 sm:gap-0">
                <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto sm:gap-8">
                  <div className="text-center">
                    <div className="font-bold text-lg sm:text-xl flex items-center justify-center gap-1 sm:gap-2"><BedDouble className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400"/> {property.specs.beds}</div>
                    <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">{t('prop.bedrooms')}</div>
                  </div>
                  <div className="w-px h-8 sm:h-10 bg-gray-200"></div>
                  <div className="text-center">
                    <div className="font-bold text-lg sm:text-xl flex items-center justify-center gap-1 sm:gap-2"><Bath className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400"/> {property.specs.baths}</div>
                    <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">{t('prop.bathrooms')}</div>
                  </div>
                  <div className="w-px h-8 sm:h-10 bg-gray-200"></div>
                  <div className="text-center">
                    <div className="font-bold text-lg sm:text-xl flex items-center justify-center gap-1 sm:gap-2"><Square className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400"/> {property.specs.sqft}</div>
                    <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">{t('prop.sqft')}</div>
                  </div>
                </div>
                <div className="flex gap-2 justify-end w-full sm:w-auto border-t sm:border-0 border-gray-100 pt-4 sm:pt-0 mt-2 sm:mt-0">`;

const newStats = `<div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 sm:py-6 border-y border-gray-200 mb-8 gap-4 sm:gap-0">
                <div className="flex flex-wrap items-center justify-between w-full sm:w-auto sm:gap-8">
                  <div className="text-center flex-1 sm:flex-none">
                    <div className="font-bold text-lg sm:text-xl flex items-center justify-center gap-1 sm:gap-2"><BedDouble className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400"/> {property.specs.beds}</div>
                    <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">{t('prop.bedrooms')}</div>
                  </div>
                  <div className="w-px h-8 sm:h-10 bg-gray-200 hidden sm:block"></div>
                  <div className="text-center flex-1 sm:flex-none border-x border-gray-200 sm:border-none px-2 sm:px-0">
                    <div className="font-bold text-lg sm:text-xl flex items-center justify-center gap-1 sm:gap-2"><Bath className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400"/> {property.specs.baths}</div>
                    <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">{t('prop.bathrooms')}</div>
                  </div>
                  <div className="w-px h-8 sm:h-10 bg-gray-200 hidden sm:block"></div>
                  <div className="text-center flex-1 sm:flex-none flex flex-col items-center justify-center relative">
                    <div className="font-bold text-lg sm:text-xl flex items-center justify-center gap-1 sm:gap-2">
                       <Square className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400"/> 
                       {property.specs.sqft}
                       {/* Mobile-only share button positioned right next to SQ FT */}
                       <div className="sm:hidden absolute -right-2 top-0 flex gap-1">
                          <Button variant="outline" size="icon" className="h-7 w-7 rounded-full bg-white shadow-sm" onClick={handleShare} title="Share Property">
                            <Share2 className="h-3 w-3" />
                          </Button>
                       </div>
                    </div>
                    <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">{t('prop.sqft')}</div>
                  </div>
                </div>
                {/* Desktop share/favorite buttons */}
                <div className="hidden sm:flex gap-2 justify-end w-full sm:w-auto">`;

if (content.includes(oldStats)) {
    content = content.replace(oldStats, newStats);
    console.log("Replaced Stats section again");
    fs.writeFileSync(path, content);
} else {
    console.log("Could not find Stats section");
}
