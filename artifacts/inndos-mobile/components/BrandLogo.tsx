import React from "react";
import { Image, StyleSheet } from "react-native";
import { useTheme } from "@/context/ThemeContext";

const WEBSITE_LOGO_HEIGHT = 36;
const WEBSITE_LOGO_ASPECT_RATIO = 1300 / 542;

export function BrandLogo() {
  const { effectiveScheme } = useTheme();

  return (
    <Image
      source={
        effectiveScheme === "dark"
          ? require("@/assets/images/logo-inndos-dark.png")
          : require("@/assets/images/logo-inndos.png")
      }
      accessibilityRole="image"
      accessibilityLabel="inndos"
      resizeMode="contain"
      style={styles.logo}
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    width: WEBSITE_LOGO_HEIGHT * WEBSITE_LOGO_ASPECT_RATIO,
    height: WEBSITE_LOGO_HEIGHT,
  },
});