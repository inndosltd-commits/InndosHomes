import React from "react";
import { Image, StyleSheet } from "react-native";

// Keep these values aligned with the website Navbar:
// <img src="/logo-inndos.png" style={{ height: "36px", width: "auto" }} />
const WEBSITE_LOGO_HEIGHT = 36;
const WEBSITE_LOGO_ASPECT_RATIO = 1300 / 542;

export function BrandLogo() {
  return (
    <Image
      source={require("@/assets/images/logo-inndos.png")}
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