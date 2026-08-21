import { useTheme } from "@/context/ThemeContext";
import colors from "@/constants/colors";

/**
 * Returns the design tokens for the current color scheme.
 *
 * Reads the persisted user preference from ThemeContext rather than the
 * device system setting, so a fresh install always starts in light mode
 * and the user's explicit choice is respected across sessions.
 *
 * Falls back to the light palette when no dark key is defined in
 * constants/colors.ts.
 */
export function useColors() {
  const { effectiveScheme } = useTheme();
  const isDark = effectiveScheme === "dark";
  const palette = isDark ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius };
}
