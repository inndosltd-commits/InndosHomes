import React from "react";
import {
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface PropertyLocationMapProps {
  lat: string;
  lng: string;
  title: string;
}

export function PropertyLocationMap({ lat, lng, title }: PropertyLocationMapProps) {
  const colors = useColors();
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  const region = {
    latitude,
    longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  const handleOpenMaps = () => {
    const label = encodeURIComponent(title);
    const url =
      Platform.OS === "ios"
        ? `maps:0,0?q=${label}@${latitude},${longitude}`
        : `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
      );
    });
  };

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>LOCATION</Text>
      <Pressable onPress={handleOpenMaps} style={styles.mapContainer}>
        <MapView
          style={styles.map}
          region={region}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          pointerEvents="none"
        >
          <Marker coordinate={{ latitude, longitude }} title={title} />
        </MapView>
        <View style={[styles.directionsBtn, { backgroundColor: colors.primary }]}>
          <Feather name="navigation" size={13} color={colors.primaryForeground} />
          <Text style={[styles.directionsBtnText, { color: colors.primaryForeground }]}>
            Get Directions
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 10,
  },
  label: {
    fontSize: 10,
    fontFamily: "Outfit_600SemiBold",
    letterSpacing: 1,
  },
  mapContainer: {
    height: 180,
    borderRadius: 12,
    overflow: "hidden",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  directionsBtn: {
    position: "absolute",
    bottom: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  directionsBtnText: {
    fontSize: 12,
    fontFamily: "Outfit_600SemiBold",
  },
});
