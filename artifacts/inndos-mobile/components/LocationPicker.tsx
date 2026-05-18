import React from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface LocationPickerProps {
  lat: string;
  lng: string;
  onLocationChange: (lat: string, lng: string) => void;
  latError?: string;
  lngError?: string;
}

export function LocationPicker({
  lat,
  lng,
  onLocationChange,
  latError,
  lngError,
}: LocationPickerProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <View style={[styles.infoBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
        <Feather name="info" size={14} color={colors.mutedForeground} />
        <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
          Enter coordinates manually. On the mobile app you can drop a pin on the map instead.
        </Text>
      </View>
      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={[styles.label, { color: colors.foreground }]}>Latitude</Text>
          <TextInput
            style={[
              styles.input,
              {
                color: colors.foreground,
                borderColor: latError ? colors.destructive : colors.border,
                backgroundColor: colors.card,
              },
            ]}
            placeholder="-1.2921"
            placeholderTextColor={colors.mutedForeground}
            value={lat}
            onChangeText={(v) => onLocationChange(v, lng)}
            keyboardType="decimal-pad"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {latError ? (
            <Text style={[styles.error, { color: colors.destructive }]}>{latError}</Text>
          ) : null}
        </View>
        <View style={styles.half}>
          <Text style={[styles.label, { color: colors.foreground }]}>Longitude</Text>
          <TextInput
            style={[
              styles.input,
              {
                color: colors.foreground,
                borderColor: lngError ? colors.destructive : colors.border,
                backgroundColor: colors.card,
              },
            ]}
            placeholder="36.8219"
            placeholderTextColor={colors.mutedForeground}
            value={lng}
            onChangeText={(v) => onLocationChange(lat, v)}
            keyboardType="decimal-pad"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {lngError ? (
            <Text style={[styles.error, { color: colors.destructive }]}>{lngError}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Outfit_400Regular",
    lineHeight: 18,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  half: {
    flex: 1,
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontFamily: "Outfit_500Medium",
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
  },
  error: {
    fontSize: 12,
    fontFamily: "Outfit_400Regular",
  },
});
