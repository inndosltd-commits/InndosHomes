import fs from 'fs';

const path = 'client/src/components/ui/PropertyMap.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldString = `      <MapContainer 
        center={center} 
        zoom={12} // Reduced zoom to 12
        scrollWheelZoom={false} 
        zoomControl={false}
        className="h-full w-full z-0"
      >`;

const newString = `      <MapContainer 
        center={center} 
        zoom={12} // Reduced zoom to 12
        scrollWheelZoom={false} 
        zoomControl={false}
        dragging={!L.Browser.mobile} // Disable dragging on mobile to prevent getting stuck
        tap={!L.Browser.mobile} // Disable tap dragging on mobile
        className="h-full w-full z-0"
      >`;

content = content.replace(oldString, newString);
fs.writeFileSync(path, content);
console.log('Fixed map scrolling on mobile');
