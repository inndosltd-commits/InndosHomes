/**
 * ThemeContext — persists user-chosen light/dark preference with AsyncStorage.
 * Defaults to "light" on fresh install regardless of the device system setting.
 * Set preference to "system" to follow the OS.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useColorScheme } from "react-native";

export type ThemePreference = "light" | "dark" | "system";

interface ThemeContextValue {
  preference: ThemePreference;
  /** Resolved effective scheme after applying the preference */
  effectiveScheme: "light" | "dark";
  setPreference: (pref: ThemePreference) => Promise<void>;
}

const THEME_KEY = "inndos_theme_preference";

const ThemeContext = createContext<ThemeContextValue>({
  preference: "light",
  effectiveScheme: "light",
  setPreference: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  // Default to "light" — overrides device dark mode on fresh install
  const [preference, setPreferenceState] = useState<ThemePreference>("light");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY)
      .then((stored) => {
        if (stored === "light" || stored === "dark" || stored === "system") {
          setPreferenceState(stored);
        }
        // If nothing stored, keep default "light"
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const setPreference = useCallback(async (pref: ThemePreference) => {
    setPreferenceState(pref);
    try {
      await AsyncStorage.setItem(THEME_KEY, pref);
    } catch {}
  }, []);

  const effectiveScheme: "light" | "dark" =
    preference === "system"
      ? systemScheme === "dark"
        ? "dark"
        : "light"
      : preference;

  // Avoid flash of wrong theme before AsyncStorage resolves
  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={{ preference, effectiveScheme, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
