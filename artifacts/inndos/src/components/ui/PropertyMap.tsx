import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { ApiProperty } from "@/components/property/PropertyCard";

import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

const houseIcon = L.divIcon({
  className: "bg-transparent",
  html: `<div class="flex items-center justify-center w-8 h-8 bg-transparent transition-transform hover:scale-125">
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="black" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-home"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

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
  properties: ApiProperty[];
}

function FlyToNairobi() {
  const map = useMap();
  useEffect(() => {
    map.setView([-1.2921, 36.8219], 11);
  }, [map]);
  return null;
}

export default function PropertyMap({ properties }: PropertyMapProps) {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const propertiesWithLocation = properties.filter((p) => {
    const lat = p.lat ? parseFloat(p.lat as string) : (p as any).location?.lat;
    const lng = p.lng ? parseFloat(p.lng as string) : (p as any).location?.lng;
    return lat && lng && !isNaN(lat) && !isNaN(lng);
  });

  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        () => {}
      );
    }
  };

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={[-1.2921, 36.8219]}
        zoom={11}
        className="w-full h-full z-0"
        zoomControl={false}
        whenReady={() => setMapReady(true)}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomControl position="bottomright" />
        <FlyToNairobi />

        {propertiesWithLocation.map((property) => {
          const lat = property.lat ? parseFloat(property.lat as string) : (property as any).location?.lat;
          const lng = property.lng ? parseFloat(property.lng as string) : (property as any).location?.lng;

          return (
            <Marker key={property.id} position={[lat, lng]} icon={houseIcon}>
              <Popup>
                <div className="w-48">
                  <img src={property.image} alt={property.title} className="w-full h-24 object-cover rounded-t-md" />
                  <div className="p-2">
                    <p className="font-bold text-sm">{property.title}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {property.address}
                    </p>
                    <p className="font-semibold text-sm mt-1">{formatCurrency(property.price)}</p>
                    <Link href={`/property/${property.id}`}>
                      <Button size="sm" className="w-full mt-2 h-7 text-xs">View Property</Button>
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {userLocation && (
          <Marker position={userLocation} icon={myLocationIcon}>
            <Popup>
              <p className="font-medium text-sm">Your Location</p>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      <button
        onClick={handleLocateMe}
        className="absolute bottom-20 right-4 z-[1000] bg-white border border-gray-200 rounded-full p-3 shadow-lg hover:shadow-xl transition-all hover:bg-gray-50"
        title="Find my location"
      >
        <MapPin className="h-5 w-5 text-gray-700" />
      </button>
    </div>
  );
}
