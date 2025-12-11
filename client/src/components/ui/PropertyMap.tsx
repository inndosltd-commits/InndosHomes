import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Property } from "@/lib/mockData";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

// Fix for default marker icon missing in React Leaflet
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom black house icon for properties
const houseIcon = L.divIcon({
  className: "bg-transparent",
  html: `<div class="flex items-center justify-center w-8 h-8 bg-transparent transition-transform hover:scale-125">
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="black" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-home"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// Custom "My Location" marker (Black circle with white dot)
const myLocationIcon = L.divIcon({
  className: "bg-transparent",
  html: `<div class="relative flex items-center justify-center w-16 h-16">
    <div class="absolute w-12 h-12 bg-black rounded-full shadow-2xl flex items-center justify-center z-20">
      <div class="w-3 h-3 bg-white rounded-full"></div>
    </div>
    <div class="absolute w-full h-full bg-black/10 rounded-full animate-pulse z-10"></div>
  </div>`,
  iconSize: [64, 64],
  iconAnchor: [32, 32],
});

interface PropertyMapProps {
  properties: Property[];
}

function UserLocationMarker() {
  const [position, setPosition] = useState<L.LatLngExpression | null>(null);
  const map = useMap();

  useEffect(() => {
    map.locate().on("locationfound", function (e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, 12); // Reduced zoom to 12 for "moderate area"
    });
    
    // Fallback for demo if location denied/not found immediately
    setTimeout(() => {
       if (!position) {
          const demoPos: L.LatLngExpression = [-1.2921, 36.8219];
          setPosition(demoPos);
       }
    }, 3000);
  }, [map]);

  return position === null ? null : (
    <>
      <Marker position={position} icon={myLocationIcon}>
         {/* No popup needed, visual is enough based on screenshot */}
      </Marker>
      {/* Floating label next to marker */}
      <Marker 
        position={position} 
        icon={L.divIcon({
          className: 'bg-transparent',
          html: `<div class="ml-10 -mt-8 whitespace-nowrap">
                  <div class="font-bold text-lg text-black">My Location</div>
                  <div class="text-xs text-gray-500 font-medium">Listed properties near me</div>
                 </div>`,
          iconSize: [200, 50],
          iconAnchor: [-20, 25]
        })}
      />
    </>
  );
}

export default function PropertyMap({ properties }: PropertyMapProps) {
  // Default center: Nairobi
  const center: [number, number] = [-1.2921, 36.8219];

  return (
    <div className="h-full w-full rounded-none overflow-hidden z-0 bg-[#f5f5f5]">
      <MapContainer 
        center={center} 
        zoom={12} // Reduced zoom to 12
        scrollWheelZoom={false} 
        zoomControl={false}
        className="h-full w-full z-0"
      >
        <ZoomControl position="bottomright" />
        
        {/* Minimalist Grayscale Map */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <UserLocationMarker />
        {properties.map((property) => (
          property.location && (
            <Marker 
              key={property.id} 
              position={[property.location.lat, property.location.lng]}
              icon={houseIcon}
              eventHandlers={{
                mouseover: (e) => {
                  e.target.openPopup();
                },
              }}
            >
              <Popup>
                <div className="min-w-[200px]">
                  <img src={property.image} alt={property.title} className="w-full h-24 object-cover rounded-md mb-2" />
                  <h3 className="font-bold text-sm truncate">{property.title}</h3>
                  <p className="text-xs text-gray-500 mb-2">{property.address}</p>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-primary">
                      {formatCurrency(property.price)}
                      {property.type !== 'sale' && '/mo'}
                    </span>
                    <Link href={`/property/${property.id}`}>
                      <Button size="sm" variant="outline" className="h-6 text-xs px-2">View</Button>
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        ))}
      </MapContainer>
    </div>
  );
}
