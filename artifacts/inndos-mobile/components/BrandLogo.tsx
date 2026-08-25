import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export function BrandLogo() {
  const colors = useColors();
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="inndos"
      style={[styles.wordmark, { backgroundColor: colors.background }]}
    >
      <Text style={[styles.text, { color: colors.foreground }]}>inndos</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wordmark: { alignSelf: "flex-start" },
  text: { fontFamily: "Outfit_700Bold", fontSize: 34, letterSpacing: -2.2, lineHeight: 38 },
});