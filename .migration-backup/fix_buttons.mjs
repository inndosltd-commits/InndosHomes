import fs from 'fs';

const path = 'client/src/pages/PropertyDetails.tsx';
let content = fs.readFileSync(path, 'utf8');

// I noticed the share icon in the screenshot is part of the stats row on the right side.
// The stats row has 2 beds | 2 baths | 1400 SQ FT | [Share Icon].
// We need to position it exactly like that. The user mentioned "too you see the part with share icon and favorite icon not mobile responsive".
// It looks like they want the share icon next to the 1400 SQ FT.

const oldStats = `<div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 sm:py-6 border-y border-gray-200 mb-8 gap-4 sm:gap-0">
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
                       <div className="sm:hidden absolute -right-8 -top-1 flex gap-1">
                          <Button variant="outline" size="icon" className="h-8 w-8 rounded-md border-gray-300 bg-white" onClick={handleShare} title="Share Property">
                            <Share2 className="h-4 w-4 text-gray-700" />
                          </Button>
                       </div>
                    </div>
                    <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">{t('prop.sqft')}</div>
                  </div>
                </div>
                {/* Desktop share/favorite buttons */}
                <div className="hidden sm:flex gap-2 justify-end w-full sm:w-auto">`;

const newStats = `<div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 sm:py-6 border-y border-gray-200 mb-8 gap-4 sm:gap-0">
                <div className="flex items-center justify-between w-full sm:w-auto sm:gap-8">
                  <div className="text-center flex-1 sm:flex-none">
                    <div className="font-bold text-lg sm:text-xl flex items-center justify-center gap-1 sm:gap-2"><BedDouble className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400"/> {property.specs.beds}</div>
                    <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">{t('prop.bedrooms')}</div>
                  </div>
                  <div className="w-px h-8 sm:h-10 bg-gray-200 block"></div>
                  <div className="text-center flex-1 sm:flex-none">
                    <div className="font-bold text-lg sm:text-xl flex items-center justify-center gap-1 sm:gap-2"><Bath className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400"/> {property.specs.baths}</div>
                    <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">{t('prop.bathrooms')}</div>
                  </div>
                  <div className="w-px h-8 sm:h-10 bg-gray-200 block"></div>
                  <div className="flex items-center justify-center gap-2 sm:gap-4 flex-1 sm:flex-none">
                    <div className="text-center flex flex-col items-center justify-center">
                      <div className="font-bold text-lg sm:text-xl flex items-center justify-center gap-1 sm:gap-2">
                         <Square className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400"/> 
                         {property.specs.sqft}
                      </div>
                      <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">{t('prop.sqft')}</div>
                    </div>
                    {/* Share/Favorite buttons positioned inline with the stats on mobile */}
                    <div className="flex sm:hidden gap-1">
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-gray-300 bg-white" onClick={handleShare} title="Share Property">
                        <Share2 className="h-4 w-4 text-gray-700" />
                      </Button>
                      <Button 
                        variant={isLiked ? "default" : "outline"} 
                        size="icon" 
                        className={\`h-8 w-8 rounded-lg \${isLiked ? "bg-red-500 border-red-500 text-white" : "border-gray-300 bg-white text-gray-700"}\`} 
                        onClick={handleLike} 
                        title="Favorite Property"
                      >
                        <Heart className={\`h-4 w-4 \${isLiked ? "fill-current" : ""}\`} />
                      </Button>
                    </div>
                  </div>
                </div>
                {/* Desktop share/favorite buttons */}
                <div className="hidden sm:flex gap-2 justify-end w-full sm:w-auto">`;

if (content.includes(oldStats)) {
    content = content.replace(oldStats, newStats);
    fs.writeFileSync(path, content);
    console.log("Updated Stats layout again for mobile share buttons");
} else {
    console.log("Could not find Stats block to replace");
}

