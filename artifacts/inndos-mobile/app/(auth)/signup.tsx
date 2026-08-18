import { useSignup } from "@workspace/api-client-react";
import { Link, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { Feather } from "@expo/vector-icons";

const ROLES: { label: string; value: string; icon: React.ComponentProps<typeof Feather>["name"]; desc: string }[] = [
  { label: "Tenant", value: "tenant", icon: "search", desc: "Looking for a place" },
  { label: "Property Owner", value: "owner", icon: "home", desc: "Selling or renting out" },
  { label: "Host / Agency", value: "host", icon: "star", desc: "BnB, Hotel or Agency" },
  { label: "Marketer", value: "guest", icon: "share-2", desc: "Referring properties" },
];

export default function SignupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useAuth();
  const isWeb = Platform.OS === "web";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("tenant");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const { mutate: doSignup, isPending } = useSignup();

  const handleSignup = () => {
    if (!name.trim() || !email.trim() || !password) {
      setError("Please fill in all fields");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    doSignup(
      { data: { name: name.trim(), email: email.trim().toLowerCase(), password, role: role as "owner" | "tenant" | "admin" | "host" | "guest" } },
      {
        onSuccess: async (data) => {
          await login(data.token, data.user);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.dismissAll();
        },
        onError: (err: unknown) => {
          const apiErr = err as { status?: number };
          if (apiErr?.status === 409) {
            setError("An account with this email already exists");
          } else {
            setError("Something went wrong. Please try again.");
          }
        },
      }
    );
  };

  const styles = getStyles(colors);
  const bottomPad = isWeb ? 34 : insets.bottom;

  return (
    <KeyboardAwareScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingBottom: bottomPad + 24 }]}
      keyboardShouldPersistTaps="handled"
      bottomOffset={16}
    >
      <View style={styles.topSection}>
        <Text style={[styles.heading, { color: colors.foreground }]}>Join inndos</Text>
        <Text style={[styles.subheading, { color: colors.mutedForeground }]}>
          Create your account to get started
        </Text>
      </View>

      {error ? (
        <View style={[styles.errorBanner, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive }]}>
          <Feather name="alert-circle" size={14} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.form}>
        <View>
          <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Full Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
            placeholder="John Doe"
            placeholderTextColor={colors.mutedForeground}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            returnKeyType="next"
          />
        </View>

        <View>
          <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Email</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
            placeholder="your@email.com"
            placeholderTextColor={colors.mutedForeground}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />
        </View>

        <View>
          <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Password</Text>
          <View style={[styles.passwordContainer, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <TextInput
              style={[styles.passwordInput, { color: colors.foreground }]}
              placeholder="Min. 6 characters"
              placeholderTextColor={colors.mutedForeground}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              returnKeyType="done"
            />
            <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
              <Feather
                name={showPassword ? "eye-off" : "eye"}
                size={18}
                color={colors.mutedForeground}
              />
            </Pressable>
          </View>
        </View>

        {/* Role selection — 2×2 grid */}
        <View>
          <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>I AM A...</Text>
          <View style={styles.roleGrid}>
            {ROLES.map((r) => {
              const isActive = role === r.value;
              return (
                <Pressable
                  key={r.value}
                  style={[
                    styles.roleCard,
                    {
                      backgroundColor: isActive ? colors.primary + "18" : colors.muted,
                      borderColor: isActive ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setRole(r.value)}
                >
                  <View style={[styles.roleIconCircle, { backgroundColor: isActive ? colors.primary : colors.border + "60" }]}>
                    <Feather name={r.icon} size={16} color={isActive ? colors.primaryForeground : colors.mutedForeground} />
                  </View>
                  <Text
                    style={[styles.roleCardLabel, { color: isActive ? colors.primary : colors.foreground }]}
                    numberOfLines={1}
                  >
                    {r.label}
                  </Text>
                  <Text
                    style={[styles.roleCardDesc, { color: colors.mutedForeground }]}
                    numberOfLines={1}
                  >
                    {r.desc}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable
          style={[styles.signupBtn, { backgroundColor: colors.primary }, isPending && { opacity: 0.6 }]}
          onPress={handleSignup}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.signupBtnText, { color: colors.primaryForeground }]}>Create Account</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.mutedForeground }]}>Already have an account?</Text>
        <Link href="/(auth)/login" asChild>
          <Pressable>
            <Text style={[styles.footerLink, { color: colors.foreground }]}>Sign In</Text>
          </Pressable>
        </Link>
      </View>
    </KeyboardAwareScrollView>
  );
}

function getStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 32,
      gap: 24,
    },
    topSection: {
      gap: 8,
    },
    heading: {
      fontSize: 28,
      fontFamily: "Outfit_700Bold",
    },
    subheading: {
      fontSize: 15,
      fontFamily: "Outfit_400Regular",
    },
    errorBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      padding: 12,
      borderWidth: 1,
    },
    errorText: {
      fontSize: 13,
      fontFamily: "Outfit_400Regular",
      flex: 1,
    },
    form: {
      gap: 16,
    },
    inputLabel: {
      fontSize: 12,
      fontFamily: "Outfit_600SemiBold",
      marginBottom: 6,
      letterSpacing: 0.5,
    },
    input: {
      paddingHorizontal: 14,
      paddingVertical: 14,
      borderWidth: 1,
      fontSize: 15,
      fontFamily: "Outfit_400Regular",
    },
    passwordContainer: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      paddingHorizontal: 14,
    },
    passwordInput: {
      flex: 1,
      paddingVertical: 14,
      fontSize: 15,
      fontFamily: "Outfit_400Regular",
    },
    eyeBtn: {
      padding: 8,
    },
    roleGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    roleCard: {
      width: "47%",
      borderWidth: 1.5,
      borderRadius: 12,
      padding: 12,
      gap: 6,
    },
    roleIconCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    roleCardLabel: {
      fontSize: 13,
      fontFamily: "Outfit_600SemiBold",
    },
    roleCardDesc: {
      fontSize: 11,
      fontFamily: "Outfit_400Regular",
    },
    signupBtn: {
      paddingVertical: 16,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
      height: 54,
    },
    signupBtnText: {
      fontSize: 15,
      fontFamily: "Outfit_600SemiBold",
    },
    footer: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 6,
    },
    footerText: {
      fontSize: 14,
      fontFamily: "Outfit_400Regular",
    },
    footerLink: {
      fontSize: 14,
      fontFamily: "Outfit_600SemiBold",
    },
  });
}
