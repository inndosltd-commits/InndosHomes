import { useState, useCallback } from "react";
import { GoogleMap, useJsApiLoader, InfoWindow } from "@react-google-maps/api";
import { AdvancedMarker } from "@/components/ui/AdvancedMarker";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { ApiProperty } from "@/components/property/PropertyCard";

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY as string;
const NAIROBI_CENTER = { lat: -1.2921, lng: 36.8219 };
const GOOGLE_MAPS_LIBRARIES: ["places", "marker"] = ["places", "marker"];

const LOCATION_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="20" fill="black" stroke="white" stroke-width="4"/><circle cx="32" cy="32" r="8" fill="white"/></svg>`;

interface PropertyMapProps {
  properties: ApiProperty[];
  userLocation?: google.maps.LatLngLiteral | null;
  onMapLoad?: (map: google.maps.Map) => void;
}

interface MappableProperty {
  property: ApiProperty;
  lat: number;
  lng: number;
}

function parseMappableProperties(props: ApiProperty[]): MappableProperty[] {
  return props.reduce<MappableProperty[]>((acc, property) => {
    const latRaw = property.lat;
    const lngRaw = property.lng;
    if (latRaw == null || lngRaw == null) return acc;
    const lat = typeof latRaw === "string" ? parseFloat(latRaw) : latRaw;
    const lng = typeof lngRaw === "string" ? parseFloat(lngRaw) : lngRaw;
    if (!isNaN(lat) && !isNaN(lng)) acc.push({ property, lat, lng });
    return acc;
  }, []);
}

export default function PropertyMap({ properties, userLocation, onMapLoad }: PropertyMapProps) {
  const [selectedProperty, setSelectedProperty] = useState<MappableProperty | null>(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const mappable = parseMappableProperties(properties);

  const handleLoad = useCallback((m: google.maps.Map) => {
    onMapLoad?.(m);
  }, [onMapLoad]);

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-gray-400 text-sm">Loading map…</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <GoogleMap
        mapContainerClassName="w-full h-full"
        center={NAIROBI_CENTER}
        zoom={11}
        onLoad={handleLoad}
        onClick={() => setSelectedProperty(null)}
        options={{
          mapId: "c7cd60c6a53a720a14502d1b",
          zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        }}
      >
        {mappable.map(({ property, lat, lng }) => (
          <AdvancedMarker
            key={property.id}
            position={{ lat, lng }}
            onClick={() => setSelectedProperty({ property, lat, lng })}
          >
            <img src="/map-pin.png" alt="property" style={{ width: 20, height: 27, display: "block" }} />
          </AdvancedMarker>
        ))}

        {selectedProperty && (
          <InfoWindow
            position={{ lat: selectedProperty.lat, lng: selectedProperty.lng }}
            onCloseClick={() => setSelectedProperty(null)}
          >
            <div className="w-48">
              <img
                src={selectedProperty.property.image?.startsWith("/objects/") ? `/api/storage${selectedProperty.property.image}` : selectedProperty.property.image}
                alt={selectedProperty.property.title}
                className="w-full h-24 object-cover rounded-t-md"
              />
              <div className="p-2">
                <p className="font-bold text-sm">{selectedProperty.property.title}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {selectedProperty.property.address}
                </p>
                <p className="font-semibold text-sm mt-1">
                  {formatCurrency(selectedProperty.property.price)}
                </p>
                <Link href={`/property/${selectedProperty.property.id}`}>
                  <Button size="sm" className="w-full mt-2 h-7 text-xs">
                    View Property
                  </Button>
                </Link>
              </div>
            </div>
          </InfoWindow>
        )}

        {userLocation && (
          <AdvancedMarker position={userLocation}>
            <div dangerouslySetInnerHTML={{ __html: LOCATION_SVG }} />
          </AdvancedMarker>
        )}
      </GoogleMap>
    </div>
  );
}
