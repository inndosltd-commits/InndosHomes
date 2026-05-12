import fs from 'fs';

const path = 'client/src/pages/PropertyDetails.tsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('Calendar Sync')) {
    // We need to import Calendar if not already there, but we can just use a mockup block.
    // The user wants a Booking Calendar UI on the property page.
    
    // Replace the Action Buttons Overlay area for BnB types to include a date picker visual
    const oldOverlay = /{!\isBooked \? \(\s*<Button className="w-full bg-primary hover:bg-primary\/90 h-12 text-lg font-bold" onClick=\{handleBook\}>\s*\{property.type === 'rent' \|\| property.type === 'sale' \? t\('prop.request_tour'\) : t\('prop.book_now'\)\}\s*<\/Button>\s*\) : \(/;
    
    const newOverlay = `
                  {property.type === 'bnb' || property.type === 'hotel' || property.type === 'hostel' ? (
                    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 shadow-sm relative z-20" onClick={e => !isBooked && e.preventDefault()}>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Select Dates</label>
                      <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md border border-gray-100">
                        <div className="flex items-center gap-2">
                           <Calendar className="h-4 w-4 text-gray-400" />
                           <span className="text-sm font-medium">Check-in</span>
                        </div>
                        <div className="h-4 w-px bg-gray-300"></div>
                        <div className="flex items-center gap-2">
                           <span className="text-sm font-medium">Check-out</span>
                        </div>
                      </div>
                      <p className="text-xs text-center text-primary mt-2 flex items-center justify-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Dates Available
                      </p>
                    </div>
                  ) : null}
                  
                  {!isBooked ? (
                    <Button className="w-full bg-primary hover:bg-primary/90 h-12 text-lg font-bold" onClick={handleBook}>
                      {property.type === 'rent' || property.type === 'sale' ? t('prop.request_tour') : t('prop.book_now')}
                    </Button>
                  ) : (`;
                  
    content = content.replace(oldOverlay, newOverlay);
    fs.writeFileSync(path, content);
    console.log("Added Calendar UI to PropertyDetails.tsx");
}

