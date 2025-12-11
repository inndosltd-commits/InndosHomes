import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Property } from "@/lib/mockData";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

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

interface PropertyMapProps {
  properties: Property[];
}

export default function PropertyMap({ properties }: PropertyMapProps) {
  // Default center: Nairobi
  const center: [number, number] = [-1.2921, 36.8219];

  return (
    <div className="h-[500px] w-full rounded-xl overflow-hidden shadow-xl border border-gray-200 z-0">
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
