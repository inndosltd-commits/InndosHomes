import type { Property } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";

interface PropertyMapViewProps {
  properties: Property[];
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;

function getPriceLabel(property: Property): string {
  const price = `KES ${property.price.toLocaleString()}`;
  if (property.type === "rent") return `${price}/mo`;
  if (property.type === "bnb" || property.type === "hotel" || property.type === "hostel") return `${price}/night`;
  return price;
}

const DEFAULT_REGION = {
  latitude: -1.2921,
  longitude: 36.8219,
  latitudeDelta: 0.5,
  longitudeDelta: 0.5,
};

export function PropertyMapView({ properties }: PropertyMapViewProps) {
  const colors = useColors();
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const mappableProperties = properties.filter(
    (p) => p.lat != null && p.lng != null && p.lat !== "" && p.lng !== ""
  );

  if (Platform.OS === "web") {
    return (
      <View style={[styles.webFallback, { backgroundColor: colors.muted }]}>
        <Feather name="map" size={48} color={colors.mutedForeground} />
        <Text style={[styles.webFallbackTitle, { color: colors.foreground }]}>
          Map view not available on web
        </Text>
        <Text style={[styles.webFallbackText, { color: colors.mutedForeground }]}>
          Use the mobile app to explore properties on the map
        </Text>
      </View>
    );
  }

  const MapView = require("react-native-maps").default;
  const { Marker, Callout } = require("react-native-maps");

  const selectedProperty = mappableProperties.find((p) => p.id === selectedId);

  const initialRegion = mappableProperties.length > 0
    ? (() => {
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
      })()
    : DEFAULT_REGION;

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton
        onPress={() => setSelectedId(null)}
      >
        {mappableProperties.map((property) => (
          <Marker
            key={property.id}
            coordinate={{
              latitude: parseFloat(property.lat!),
              longitude: parseFloat(property.lng!),
            }}
            onPress={() => setSelectedId(property.id)}
          >
            <View
              style={[
                styles.pin,
                {
                  backgroundColor:
                    selectedId === property.id ? colors.primary : colors.card,
                  borderColor:
                    selectedId === property.id ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.pinText,
                  {
                    color:
                      selectedId === property.id
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
        ))}
      </MapView>

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
          style={[styles.calloutCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() =>
            router.push({ pathname: "/property/[id]", params: { id: selectedProperty.id } })
          }
        >
          <View style={styles.calloutContent}>
            <Text style={[styles.calloutTitle, { color: colors.foreground }]} numberOfLines={1}>
              {selectedProperty.title}
            </Text>
            <Text style={[styles.calloutAddress, { color: colors.mutedForeground }]} numberOfLines={1}>
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
  webFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 40,
  },
  webFallbackTitle: {
    fontSize: 18,
    fontFamily: "Outfit_600SemiBold",
    textAlign: "center",
  },
  webFallbackText: {
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
    textAlign: "center",
  },
});
