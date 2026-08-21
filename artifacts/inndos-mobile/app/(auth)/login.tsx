import { useLogin } from "@workspace/api-client-react";
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
import { getApiBaseUrl } from "@/utils/api";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useAuth();
  const isWeb = Platform.OS === "web";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotEmailSent, setForgotEmailSent] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const { mutate: doLogin, isPending } = useLogin();

  const handleLogin = () => {
    if (!email.trim() || !password) {
      setError("Please enter your email and password");
      return;
    }
    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    doLogin(
      { data: { email: email.trim().toLowerCase(), password } },
      {
        onSuccess: async (data) => {
          await login(data.token, data.user);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.dismissAll();
        },
        onError: (err: unknown) => {
          const apiErr = err as { status?: number; data?: { error?: string } };
          if (apiErr?.status === 401) {
            setError("Invalid email or password");
          } else if (apiErr?.data?.error) {
            setError(apiErr.data.error);
          } else if (err instanceof Error) {
            setError(err.message || "Something went wrong. Please try again.");
          } else {
            setError("Something went wrong. Please try again.");
          }
        },
      }
    );
  };

  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError("Please enter your email address");
      return;
    }

    setError("");
    setIsSendingReset(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok) {
        setError(data.error ?? "Could not send the reset email. Please try again.");
        return;
      }

      setForgotEmailSent(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setIsSendingReset(false);
    }
  };

  const showSignIn = () => {
    setIsForgotPassword(false);
    setForgotEmailSent(false);
    setError("");
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
        <Text style={[styles.heading, { color: colors.foreground }]}>
          {isForgotPassword ? "Reset your password" : "Welcome back"}
        </Text>
        <Text style={[styles.subheading, { color: colors.mutedForeground }]}>
          {isForgotPassword
            ? "Enter your email and we'll send reset instructions."
            : "Sign in to your inndos account"}
        </Text>
      </View>

      {error ? (
        <View style={[styles.errorBanner, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive }]}>
          <Feather name="alert-circle" size={14} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        </View>
      ) : null}

      {isForgotPassword ? (
        <View style={styles.form}>
          {forgotEmailSent ? (
            <View style={styles.confirmation}>
              <Feather name="mail" size={42} color={colors.primary} />
              <Text style={[styles.confirmationTitle, { color: colors.foreground }]}>
                Check your email
              </Text>
              <Text style={[styles.confirmationText, { color: colors.mutedForeground }]}>
                We sent a password reset link to your inbox. The link expires in 1 hour.
              </Text>
            </View>
          ) : (
            <>
              <View>
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Email Address</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="name@example.com"
                  placeholderTextColor={colors.mutedForeground}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                  returnKeyType="send"
                  onSubmitEditing={handleForgotPassword}
                />
              </View>
              <Pressable
                style={[styles.loginBtn, { backgroundColor: colors.primary }, isSendingReset && { opacity: 0.6 }]}
                onPress={handleForgotPassword}
                disabled={isSendingReset}
              >
                {isSendingReset ? (
                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                ) : (
                  <Text style={[styles.loginBtnText, { color: colors.primaryForeground }]}>Send Reset Link</Text>
                )}
              </Pressable>
            </>
          )}
          <Pressable onPress={showSignIn} style={styles.backLink}>
            <Text style={[styles.footerLink, { color: colors.foreground }]}>Back to sign in</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.form}>
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
              placeholder="Password"
              placeholderTextColor={colors.mutedForeground}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
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

          <Pressable
            style={[styles.loginBtn, { backgroundColor: colors.primary }, isPending && { opacity: 0.6 }]}
            onPress={handleLogin}
            disabled={isPending}
          >
            {isPending ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.loginBtnText, { color: colors.primaryForeground }]}>Sign In</Text>
            )}
          </Pressable>
          <Pressable onPress={() => { setIsForgotPassword(true); setError(""); }} style={styles.forgotLink}>
            <Text style={[styles.footerLink, { color: colors.foreground }]}>Forgot password?</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.mutedForeground }]}>No account?</Text>
        <Link href="/(auth)/signup" asChild>
          <Pressable>
            <Text style={[styles.footerLink, { color: colors.foreground }]}>Create one</Text>
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
    loginBtn: {
      paddingVertical: 16,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
      height: 54,
    },
    loginBtnText: {
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
    forgotLink: {
      alignItems: "center",
      marginTop: -4,
    },
    backLink: {
      alignItems: "center",
      marginTop: 4,
    },
    confirmation: {
      alignItems: "center",
      gap: 10,
      paddingVertical: 12,
    },
    confirmationTitle: {
      fontSize: 18,
      fontFamily: "Outfit_600SemiBold",
    },
    confirmationText: {
      fontSize: 14,
      fontFamily: "Outfit_400Regular",
      lineHeight: 20,
      textAlign: "center",
    },
  });
}
