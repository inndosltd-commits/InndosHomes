import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Property } from "@/lib/mockData";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";

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

// Custom icon for user location
const userIcon = L.divIcon({
  className: "bg-transparent",
  html: `<div class="relative flex items-center justify-center w-8 h-8">
    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
    <span class="relative inline-flex rounded-full h-4 w-4 bg-blue-600 border-2 border-white"></span>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
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
      map.flyTo(e.latlng, 13);
    });
  }, [map]);

  return position === null ? null : (
    <Marker position={position} icon={userIcon}>
      <Popup>You are here</Popup>
    </Marker>
  );
}

export default function PropertyMap({ properties }: PropertyMapProps) {
  // Default center: Nairobi
  const center: [number, number] = [-1.2921, 36.8219];

  return (
    <div className="h-full w-full rounded-none overflow-hidden z-0">
      <MapContainer 
        center={center} 
        zoom={12} 
        scrollWheelZoom={false} 
        className="h-full w-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <UserLocationMarker />
        {properties.map((property) => (
          property.location && (
            <Marker 
              key={property.id} 
              position={[property.location.lat, property.location.lng]}
            >
              <Popup>
                <div className="min-w-[200px]">
                  <img src={property.image} alt={property.title} className="w-full h-24 object-cover rounded-md mb-2" />
                  <h3 className="font-bold text-sm truncate">{property.title}</h3>
                  <p className="text-xs text-gray-500 mb-2">{property.address}</p>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-primary">
                      ${property.price.toLocaleString()}
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
