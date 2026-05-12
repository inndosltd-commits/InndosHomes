import fs from 'fs';

const path = 'client/src/components/ui/PropertyMap.tsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('MapUpdater')) {
    const updaterComponent = `
function MapUpdater({ properties }: { properties: Property[] }) {
  const map = useMap();
  
  useEffect(() => {
    // Only adjust bounds if we have a filtered subset (e.g. from search)
    // To prevent hijacking the initial UserLocationMarker flyTo, we can just check if properties is small,
    // or just fly to the selected property.
    if (properties.length === 1 && properties[0].location) {
      map.flyTo([properties[0].location.lat, properties[0].location.lng], 15, { animate: true, duration: 1.5 });
    } else if (properties.length > 0 && properties.length < 20) {
      // If we filtered down to a few properties, fit bounds
      const validProps = properties.filter(p => p.location);
      if (validProps.length > 0) {
        const bounds = L.latLngBounds(validProps.map(p => [p.location.lat, p.location.lng]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: true });
      }
    }
  }, [properties, map]);

  return null;
}
`;

    content = content.replace('export default function PropertyMap', updaterComponent + '\nexport default function PropertyMap');
    
    // Add <MapUpdater properties={properties} /> inside MapContainer
    content = content.replace('<UserLocationMarker />', '<UserLocationMarker />\n        <MapUpdater properties={properties} />');
    
    fs.writeFileSync(path, content);
    console.log("Added MapUpdater to PropertyMap");
}
