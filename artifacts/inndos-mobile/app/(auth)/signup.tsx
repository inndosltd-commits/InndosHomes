import { useSignup } from "@workspace/api-client-react";
import { Link, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
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

type Step = "phone" | "otp" | "details";

async function readApiResponse(response: Response): Promise<{ phoneToken?: string; error?: string }> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as { phoneToken?: string; error?: string };
  } catch {
    return { error: response.ok ? undefined : "The verification service returned an unexpected response." };
  }
}

const ROLES: {
  label: string;
  value: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  desc: string;
}[] = [
  { label: "Tenant", value: "tenant", icon: "search", desc: "Looking for a place" },
  { label: "Property Owner", value: "owner", icon: "home", desc: "Selling or renting out" },
  { label: "Host / Agency", value: "host", icon: "star", desc: "BnB, Hotel or Agency" },
  { label: "Marketer", value: "guest", icon: "share-2", desc: "Referring properties" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function SignupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useAuth();
  const isWeb = Platform.OS === "web";

  // --- step tracking ---
  const [step, setStep] = useState<Step>("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // --- step 1: phone ---
  const [phone, setPhone] = useState("");

  // --- step 2: OTP ---
  const [otp, setOtp] = useState("");
  const [phoneToken, setPhoneToken] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- step 3: details ---
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("tenant");
  const [showPassword, setShowPassword] = useState(false);

  const { mutate: doSignup, isPending: signupPending } = useSignup();

  // ---------------------------------------------------------------------------
  // Step 1 → send OTP
  // ---------------------------------------------------------------------------
  const handleSendOtp = async () => {
    const trimmed = phone.trim();
    if (!trimmed) { setError("Please enter your phone number"); return; }
    setError("");
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const baseUrl = getApiBaseUrl();
      if (!baseUrl.startsWith("http")) {
        setError("Phone verification is not configured in this app build.");
        return;
      }
      const res = await fetch(`${baseUrl}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: trimmed }),
      });
      const json = await readApiResponse(res);
      if (!res.ok) {
        setError(json.error ?? "Failed to send code. Please try again.");
      } else {
        setStep("otp");
        startCooldown();
      }
    } catch (error) {
      setError(error instanceof Error && error.message ? error.message : "Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const startCooldown = () => {
    setResendCooldown(60);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return s - 1;
      });
    }, 1000);
  };

  // ---------------------------------------------------------------------------
  // Step 2 → verify OTP
  // ---------------------------------------------------------------------------
  const handleVerifyOtp = async () => {
    const code = otp.trim();
    if (code.length < 4) { setError("Please enter the full verification code"); return; }
    setError("");
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const baseUrl = getApiBaseUrl();
      if (!baseUrl.startsWith("http")) {
        setError("Phone verification is not configured in this app build.");
        return;
      }
      const res = await fetch(`${baseUrl}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), code }),
      });
      const json = await readApiResponse(res);
      if (!res.ok || !json.phoneToken) {
        setError(json.error ?? "Invalid or expired code. Please try again.");
      } else {
        setPhoneToken(json.phoneToken);
        setStep("details");
      }
    } catch (error) {
      setError(error instanceof Error && error.message ? error.message : "Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Step 3 → create account
  // ---------------------------------------------------------------------------
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
      {
        data: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role: role as "owner" | "tenant" | "admin" | "host" | "guest",
          // @ts-expect-error phoneToken is required by API but not in generated type yet
          phoneToken,
        },
      },
      {
        onSuccess: async (data) => {
          await login(data.token, data.user);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.dismissAll();
        },
        onError: (err: unknown) => {
          const apiErr = err as { status?: number; data?: { error?: string } };
          if (apiErr?.status === 409) {
            setError("An account with this email already exists");
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

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const styles = getStyles(colors);
  const bottomPad = isWeb ? 34 : insets.bottom;
  const busy = loading || signupPending;

  return (
    <KeyboardAwareScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingBottom: bottomPad + 24 }]}
      keyboardShouldPersistTaps="handled"
      bottomOffset={16}
    >
      {/* Header */}
      <View style={styles.topSection}>
        {step !== "phone" && (
          <Pressable onPress={() => { setStep(step === "otp" ? "phone" : "otp"); setError(""); }} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </Pressable>
        )}
        <Text style={[styles.heading, { color: colors.foreground }]}>
          {step === "phone" ? "Join inndos" : step === "otp" ? "Verify phone" : "Your details"}
        </Text>
        <Text style={[styles.subheading, { color: colors.mutedForeground }]}>
          {step === "phone"
            ? "Enter your phone number to get started"
            : step === "otp"
            ? `We sent a code to ${phone.trim()}`
            : "Almost there — fill in your account info"}
        </Text>
      </View>

      {/* Step indicator */}
      <View style={styles.steps}>
        {(["phone", "otp", "details"] as Step[]).map((s, i) => (
          <View key={s} style={styles.stepRow}>
            <View
              style={[
                styles.stepDot,
                {
                  backgroundColor:
                    s === step
                      ? colors.primary
                      : (["phone", "otp", "details"] as Step[]).indexOf(s) <
                        (["phone", "otp", "details"] as Step[]).indexOf(step)
                      ? colors.primary + "60"
                      : colors.border,
                },
              ]}
            />
            {i < 2 && <View style={[styles.stepLine, { backgroundColor: colors.border }]} />}
          </View>
        ))}
      </View>

      {/* Error banner */}
      {error ? (
        <View style={[styles.errorBanner, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive }]}>
          <Feather name="alert-circle" size={14} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        </View>
      ) : null}

      {/* ---- STEP 1: Phone ---- */}
      {step === "phone" && (
        <View style={styles.form}>
          <View>
            <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>PHONE NUMBER</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
              placeholder="07XXXXXXXX or +254XXXXXXXXX"
              placeholderTextColor={colors.mutedForeground}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleSendOtp}
            />
          </View>
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: colors.primary }, busy && { opacity: 0.6 }]}
            onPress={handleSendOtp}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Send Verification Code</Text>
            )}
          </Pressable>
        </View>
      )}

      {/* ---- STEP 2: OTP ---- */}
      {step === "otp" && (
        <View style={styles.form}>
          <View>
            <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>VERIFICATION CODE</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground, letterSpacing: 8, fontSize: 22 }]}
              placeholder="- - - - - -"
              placeholderTextColor={colors.mutedForeground}
              value={otp}
              onChangeText={(v) => setOtp(v.replace(/\D/g, "").slice(0, 6))}
              keyboardType="number-pad"
              returnKeyType="done"
              onSubmitEditing={handleVerifyOtp}
              maxLength={6}
            />
          </View>
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: colors.primary }, busy && { opacity: 0.6 }]}
            onPress={handleVerifyOtp}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Verify Code</Text>
            )}
          </Pressable>
          <Pressable
            onPress={() => { if (resendCooldown === 0) { setOtp(""); handleSendOtp(); } }}
            disabled={resendCooldown > 0}
            style={styles.resendBtn}
          >
            <Text style={[styles.resendText, { color: resendCooldown > 0 ? colors.mutedForeground : colors.foreground }]}>
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
            </Text>
          </Pressable>
        </View>
      )}

      {/* ---- STEP 3: Details ---- */}
      {step === "details" && (
        <View style={styles.form}>
          <View>
            <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>FULL NAME</Text>
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
            <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>EMAIL</Text>
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
            <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>PASSWORD</Text>
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
                <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
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
                    key={r.label}
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
                    <Text style={[styles.roleCardLabel, { color: isActive ? colors.primary : colors.foreground }]} numberOfLines={1}>
                      {r.label}
                    </Text>
                    <Text style={[styles.roleCardDesc, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {r.desc}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Pressable
            style={[styles.primaryBtn, { backgroundColor: colors.primary }, signupPending && { opacity: 0.6 }]}
            onPress={handleSignup}
            disabled={signupPending}
          >
            {signupPending ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Create Account</Text>
            )}
          </Pressable>
        </View>
      )}

      {/* Footer */}
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

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
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
    backBtn: {
      marginBottom: 4,
      alignSelf: "flex-start",
      padding: 4,
    },
    heading: {
      fontSize: 28,
      fontFamily: "Outfit_700Bold",
    },
    subheading: {
      fontSize: 15,
      fontFamily: "Outfit_400Regular",
    },
    steps: {
      flexDirection: "row",
      alignItems: "center",
    },
    stepRow: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    stepDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    stepLine: {
      flex: 1,
      height: 2,
      marginHorizontal: 4,
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
    primaryBtn: {
      paddingVertical: 16,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
      height: 54,
    },
    primaryBtnText: {
      fontSize: 15,
      fontFamily: "Outfit_600SemiBold",
    },
    resendBtn: {
      alignItems: "center",
      paddingVertical: 8,
    },
    resendText: {
      fontSize: 14,
      fontFamily: "Outfit_400Regular",
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
