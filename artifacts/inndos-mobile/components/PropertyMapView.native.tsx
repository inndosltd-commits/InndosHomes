import type { Property } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";
import Supercluster from "supercluster";
import { useColors } from "@/hooks/useColors";
import { getImageUrl } from "@/utils/imageUrl";
import { Feather } from "@expo/vector-icons";

export interface MapBBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

interface PropertyMapViewProps {
  properties: Property[];
  onSearchArea?: (bbox: MapBBox) => void;
}

const SCREEN_WIDTH = Dimensions.get("window").width;

function getPriceLabel(property: Property): string {
  const price = `KES ${property.price.toLocaleString()}`;
  if (property.type === "rent") return `${price}/mo`;
  if (
    property.type === "bnb" ||
    property.type === "hotel" ||
    property.type === "hostel"
  )
    return `${price}/night`;
  return price;
}

const DEFAULT_REGION: Region = {
  latitude: -1.2921,
  longitude: 36.8219,
  latitudeDelta: 0.5,
  longitudeDelta: 0.5,
};

function regionToZoom(latitudeDelta: number): number {
  return Math.min(20, Math.max(0, Math.round(Math.log(360 / latitudeDelta) / Math.LN2)));
}

function regionToBBox(
  region: Region
): [number, number, number, number] {
  return [
    region.longitude - region.longitudeDelta / 2,
    region.latitude - region.latitudeDelta / 2,
    region.longitude + region.longitudeDelta / 2,
    region.latitude + region.latitudeDelta / 2,
  ];
}

function regionToMapBBox(region: Region): MapBBox {
  return {
    minLat: region.latitude - region.latitudeDelta / 2,
    maxLat: region.latitude + region.latitudeDelta / 2,
    minLng: region.longitude - region.longitudeDelta / 2,
    maxLng: region.longitude + region.longitudeDelta / 2,
  };
}

function regionsAreSimilar(a: Region, b: Region, threshold = 0.01): boolean {
  return (
    Math.abs(a.latitude - b.latitude) < threshold &&
    Math.abs(a.longitude - b.longitude) < threshold &&
    Math.abs(a.latitudeDelta - b.latitudeDelta) < threshold * 5 &&
    Math.abs(a.longitudeDelta - b.longitudeDelta) < threshold * 5
  );
}

type PropertyFeature = GeoJSON.Feature<
  GeoJSON.Point,
  { propertyId: string }
>;

export function PropertyMapView({ properties, onSearchArea }: PropertyMapViewProps) {
  const colors = useColors();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [thumbError, setThumbError] = useState(false);

  useEffect(() => {
    setThumbError(false);
  }, [selectedId]);

  const mappableProperties = useMemo(
    () =>
      properties.filter(
        (p) => p.lat != null && p.lng != null && p.lat !== "" && p.lng !== ""
      ),
    [properties]
  );

  const initialRegion = useMemo<Region>(() => {
    if (mappableProperties.length === 0) return DEFAULT_REGION;
    const lats = mappableProperties.map((p) => parseFloat(p.lat!));
    const lngs = mappableProperties.map((p) => parseFloat(p.lng!));
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const paddingFactor = 1.4;
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(0.05, (maxLat - minLat) * paddingFactor),
      longitudeDelta: Math.max(0.05, (maxLng - minLng) * paddingFactor),
    };
  }, [mappableProperties]);

  const [region, setRegion] = useState<Region>(initialRegion);
  const [showSearchButton, setShowSearchButton] = useState(false);
  const committedRegionRef = useRef<Region>(initialRegion);

  const supercluster = useMemo(() => {
    const sc = new Supercluster<{ propertyId: string }>({ radius: 60, maxZoom: 18 });
    const features: PropertyFeature[] = mappableProperties.map((p) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [parseFloat(p.lng!), parseFloat(p.lat!)],
      },
      properties: { propertyId: p.id },
    }));
    sc.load(features);
    return sc;
  }, [mappableProperties]);

  const clusters = useMemo(() => {
    const zoom = regionToZoom(region.latitudeDelta);
    const bbox = regionToBBox(region);
    return supercluster.getClusters(bbox, zoom);
  }, [supercluster, region]);

  const handleRegionChangeComplete = useCallback((newRegion: Region) => {
    setRegion(newRegion);
    setSelectedId(null);
    if (!regionsAreSimilar(newRegion, committedRegionRef.current)) {
      setShowSearchButton(true);
    }
  }, []);

  const handleSearchArea = useCallback(() => {
    setShowSearchButton(false);
    committedRegionRef.current = region;
    onSearchArea?.(regionToMapBBox(region));
  }, [region, onSearchArea]);

  const handleClusterPress = useCallback(
    (clusterId: number, coordinate: { latitude: number; longitude: number }) => {
      const expansionZoom = Math.min(
        supercluster.getClusterExpansionZoom(clusterId),
        18
      );
      const newLatitudeDelta = 360 / Math.pow(2, expansionZoom);
      mapRef.current?.animateToRegion(
        {
          ...coordinate,
          latitudeDelta: newLatitudeDelta,
          longitudeDelta: newLatitudeDelta,
        },
        400
      );
    },
    [supercluster]
  );

  const selectedProperty = mappableProperties.find((p) => p.id === selectedId);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton
        onRegionChangeComplete={handleRegionChangeComplete}
        onPress={() => setSelectedId(null)}
      >
        {clusters.map((cluster) => {
          const [lng, lat] = cluster.geometry.coordinates;
          const coordinate = { latitude: lat, longitude: lng };

          if ("cluster" in cluster.properties && cluster.properties.cluster) {
            const { cluster_id, point_count } = cluster.properties as {
              cluster_id: number;
              point_count: number;
            };
            return (
              <Marker
                key={`cluster-${cluster_id}`}
                coordinate={coordinate}
                onPress={() => handleClusterPress(cluster_id, coordinate)}
              >
                <View
                  style={[
                    styles.clusterOuter,
                    { backgroundColor: colors.primary + "33", borderColor: colors.primary },
                  ]}
                >
                  <View
                    style={[styles.clusterInner, { backgroundColor: colors.primary }]}
                  >
                    <Text style={[styles.clusterText, { color: colors.primaryForeground }]}>
                      {point_count}
                    </Text>
                  </View>
                </View>
              </Marker>
            );
          }

          const propertyId = (cluster.properties as { propertyId: string }).propertyId;
          const property = mappableProperties.find((p) => p.id === propertyId);
          if (!property) return null;

          const isSelected = selectedId === propertyId;
          return (
            <Marker
              key={property.id}
              coordinate={coordinate}
              onPress={() => setSelectedId(property.id)}
            >
              <View
                style={[
                  styles.pin,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.card,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.pinText,
                    {
                      color: isSelected
                        ? colors.primaryForeground
                        : colors.foreground,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {`KES ${property.price.toLocaleString()}`}
                </Text>
              </View>
            </Marker>
          );
        })}
      </MapView>

      {showSearchButton && onSearchArea && (
        <View style={styles.searchButtonContainer}>
          <Pressable
            style={[
              styles.searchButton,
              { backgroundColor: colors.primary, shadowColor: colors.primary },
            ]}
            onPress={handleSearchArea}
          >
            <Feather name="search" size={14} color={colors.primaryForeground} />
            <Text style={[styles.searchButtonText, { color: colors.primaryForeground }]}>
              Search this area
            </Text>
          </Pressable>
        </View>
      )}

      {mappableProperties.length === 0 && (
        <View style={[styles.emptyOverlay, { backgroundColor: colors.muted }]}>
          <Feather name="map-pin" size={32} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            No properties with locations
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Properties with saved coordinates will appear as pins on the map
          </Text>
        </View>
      )}

      {selectedProperty && (
        <Pressable
          style={[
            styles.calloutCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() =>
            router.push({
              pathname: "/property/[id]",
              params: { id: selectedProperty.id },
            })
          }
        >
          {selectedProperty.image && !thumbError ? (
            <Image
              source={{ uri: getImageUrl(selectedProperty.image) }}
              style={styles.calloutThumb}
              resizeMode="cover"
              onError={() => setThumbError(true)}
            />
          ) : (
            <View
              style={[styles.calloutThumbFallback, { backgroundColor: colors.muted }]}
            >
              <Feather name="map-pin" size={22} color={colors.mutedForeground} />
            </View>
          )}
          <View style={styles.calloutContent}>
            <Text
              style={[styles.calloutTitle, { color: colors.foreground }]}
              numberOfLines={1}
            >
              {selectedProperty.title}
            </Text>
            <Text
              style={[styles.calloutAddress, { color: colors.mutedForeground }]}
              numberOfLines={1}
            >
              {selectedProperty.address}
            </Text>
            <Text style={[styles.calloutPrice, { color: colors.primary }]}>
              {getPriceLabel(selectedProperty)}
            </Text>
          </View>
          <View style={[styles.calloutArrow, { backgroundColor: colors.primary }]}>
            <Feather name="arrow-right" size={16} color={colors.primaryForeground} />
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: SCREEN_WIDTH,
    height: "100%",
  },
  searchButtonContainer: {
    position: "absolute",
    top: 16,
    left: 0,
    right: 0,
    alignItems: "center",
    pointerEvents: "box-none",
  },
  searchButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  searchButtonText: {
    fontSize: 14,
    fontFamily: "Outfit_600SemiBold",
  },
  clusterOuter: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  clusterInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  clusterText: {
    fontSize: 14,
    fontFamily: "Outfit_700Bold",
  },
  pin: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  pinText: {
    fontSize: 12,
    fontFamily: "Outfit_600SemiBold",
    maxWidth: 100,
  },
  emptyOverlay: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    padding: 24,
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Outfit_600SemiBold",
    textAlign: "center",
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Outfit_400Regular",
    textAlign: "center",
  },
  calloutCard: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  calloutThumb: {
    width: 80,
    alignSelf: "stretch",
  },
  calloutThumbFallback: {
    width: 80,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
  },
  calloutContent: {
    flex: 1,
    padding: 14,
    gap: 4,
  },
  calloutTitle: {
    fontSize: 15,
    fontFamily: "Outfit_600SemiBold",
  },
  calloutAddress: {
    fontSize: 12,
    fontFamily: "Outfit_400Regular",
  },
  calloutPrice: {
    fontSize: 14,
    fontFamily: "Outfit_700Bold",
  },
  calloutArrow: {
    width: 48,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
  },
});
