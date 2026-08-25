import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { getApiBaseUrl } from "@/utils/api";

interface LocationPickerProps {
  lat: string;
  lng: string;
  onLocationChange: (lat: string, lng: string) => void;
  onAddressResolved?: (address: string, options?: { replace?: boolean }) => void;
  latError?: string;
  lngError?: string;
}

export function LocationPicker({
  lat,
  lng,
  onLocationChange,
  onAddressResolved,
  latError,
  lngError,
}: LocationPickerProps) {
  const colors = useColors();
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ placeId: string; description: string; secondaryText: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const requestIdRef = useRef(0);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    const trimmed = query.trim();
    if (!token || trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setNotice("");
      try {
        const response = await fetch(
          `${getApiBaseUrl()}/api/maps/places?query=${encodeURIComponent(trimmed)}&sessiontoken=listing-${Date.now()}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const payload = await response.json() as {
          results?: Array<{ placeId: string; description: string; secondaryText: string }>;
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error ?? "Place search is unavailable");
        if (requestId === requestIdRef.current) setResults(payload.results ?? []);
      } catch (error) {
        if (requestId === requestIdRef.current) {
          setResults([]);
          setNotice(error instanceof Error ? error.message : "Place search is unavailable");
        }
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, token]);

  const selectPlace = async (place: { placeId: string; description: string }) => {
    if (!token) return;
    setLoading(true);
    setNotice("");
    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/maps/places/${encodeURIComponent(place.placeId)}?sessiontoken=listing-${Date.now()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const payload = await response.json() as {
        place?: { address?: string; description?: string; latitude: number; longitude: number };
        error?: string;
      };
      if (!response.ok || !payload.place) throw new Error(payload.error ?? "That place could not be resolved");

      const address = payload.place.address || payload.place.description || place.description;
      onLocationChange(String(payload.place.latitude), String(payload.place.longitude));
      onAddressResolved?.(address, { replace: true });
      setQuery(address);
      setResults([]);
      setNotice("Location selected. Coordinates and address have been saved.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "That place could not be resolved");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <Text style={[styles.label, { color: colors.foreground }]}>Search for a place</Text>
        <View style={[styles.searchInputWrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Feather name="search" size={15} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Area, building, or address"
            placeholderTextColor={colors.mutedForeground}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="words"
            autoCorrect={false}
          />
          {loading ? <ActivityIndicator size="small" color={colors.primary} /> : null}
        </View>
        {results.map((place) => (
          <Pressable
            key={place.placeId}
            style={[styles.result, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={() => void selectPlace(place)}
            disabled={loading}
          >
            <Feather name="map-pin" size={14} color={colors.primary} />
            <View style={styles.resultText}>
              <Text numberOfLines={1} style={[styles.resultTitle, { color: colors.foreground }]}>{place.description}</Text>
              {place.secondaryText ? <Text numberOfLines={1} style={[styles.resultSubtitle, { color: colors.mutedForeground }]}>{place.secondaryText}</Text> : null}
            </View>
          </Pressable>
        ))}
        {notice ? <Text style={[styles.notice, { color: colors.mutedForeground }]}>{notice}</Text> : null}
      </View>
      <View style={[styles.infoBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
        <Feather name="info" size={14} color={colors.mutedForeground} />
        <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
          Select a search result to save its address and coordinates, or enter coordinates manually.
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
  searchWrap: {
    gap: 6,
  },
  searchInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
  },
  result: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderWidth: 1,
    borderTopWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  resultText: {
    flex: 1,
    gap: 2,
  },
  resultTitle: {
    fontSize: 13,
    fontFamily: "Outfit_500Medium",
  },
  resultSubtitle: {
    fontSize: 11,
    fontFamily: "Outfit_400Regular",
  },
  notice: {
    fontSize: 11,
    fontFamily: "Outfit_400Regular",
    lineHeight: 16,
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
