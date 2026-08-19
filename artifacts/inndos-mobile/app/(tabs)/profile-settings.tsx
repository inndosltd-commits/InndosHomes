import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { getApiBaseUrl } from "@/utils/api";

export default function ProfileSettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, token, updateUser } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [businessName, setBusinessName] = useState(user?.businessName ?? "");
  const [isRegisteredFirm, setIsRegisteredFirm] = useState(Boolean(user?.isRegisteredFirm));
  const [firmType, setFirmType] = useState<"business_name" | "registered_company">(
    user?.firmType === "registered_company" ? "registered_company" : "business_name"
  );
  const [otp, setOtp] = useState("");
  const [phoneToken, setPhoneToken] = useState<string | null>(null);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!user || !token) return null;

  const sendCode = async () => {
    if (!phone.trim()) {
      Alert.alert("Enter a phone number", "Add the number you would like to verify first.");
      return;
    }
    setSendingCode(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const json = await response.json() as { error?: string };
      if (!response.ok) throw new Error(json.error ?? "Unable to send a verification code");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Verification code sent", `Enter the code sent to ${phone.trim()}.`);
    } catch (error) {
      Alert.alert("Could not send code", error instanceof Error ? error.message : "Try again shortly.");
    } finally {
      setSendingCode(false);
    }
  };

  const verifyCode = async () => {
    if (!otp.trim()) {
      Alert.alert("Enter the code", "Use the verification code sent to your phone.");
      return;
    }
    setVerifyingCode(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), code: otp.trim() }),
      });
      const json = await response.json() as { phoneToken?: string; error?: string };
      if (!response.ok || !json.phoneToken) throw new Error(json.error ?? "The verification code is not valid");
      setPhoneToken(json.phoneToken);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Phone verified", "Your new number will be saved with the profile.");
    } catch (error) {
      Alert.alert("Could not verify code", error instanceof Error ? error.message : "Try again.");
    } finally {
      setVerifyingCode(false);
    }
  };

  const saveProfile = async () => {
    if (!name.trim()) {
      Alert.alert("Name required", "Add your full name before saving.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/auth/profile`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          businessName: businessName.trim(),
          isRegisteredFirm,
          firmType,
          ...(phoneToken ? { phoneToken } : {}),
        }),
      });
      const json = await response.json() as { error?: string };
      if (!response.ok) throw new Error(json.error ?? "Profile could not be saved");
      await updateUser(json as typeof user);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Profile updated", "Your account details have been saved.", [
        { text: "Done", onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert("Could not save profile", error instanceof Error ? error.message : "Try again.");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = [styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }];

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Edit Profile</Text>
        <View style={styles.backButton} />
      </View>

      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 36 }]}
        bottomOffset={64}
      >
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>PERSONAL DETAILS</Text>
        <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Full name</Text>
        <TextInput value={name} onChangeText={setName} style={inputStyle} placeholder="Your name" placeholderTextColor={colors.mutedForeground} autoCapitalize="words" />
        <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Email</Text>
        <View style={[styles.readOnly, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Text style={[styles.readOnlyText, { color: colors.mutedForeground }]}>{user.email}</Text>
          <Feather name="lock" size={14} color={colors.mutedForeground} />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>PHONE VERIFICATION</Text>
        <Text style={[styles.helper, { color: colors.mutedForeground }]}>A changed phone number must be verified before it is saved.</Text>
        <TextInput value={phone} onChangeText={(value) => { setPhone(value); setPhoneToken(null); }} style={inputStyle} placeholder="+254 700 000 000" placeholderTextColor={colors.mutedForeground} keyboardType="phone-pad" />
        <Pressable disabled={sendingCode} onPress={sendCode} style={[styles.outlineButton, { borderColor: colors.primary, opacity: sendingCode ? 0.6 : 1 }]}>
          {sendingCode ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={[styles.outlineButtonText, { color: colors.primary }]}>Send verification code</Text>}
        </Pressable>
        <View style={styles.codeRow}>
          <TextInput value={otp} onChangeText={setOtp} style={[inputStyle, styles.codeInput]} placeholder="Verification code" placeholderTextColor={colors.mutedForeground} keyboardType="number-pad" />
          <Pressable disabled={verifyingCode || Boolean(phoneToken)} onPress={verifyCode} style={[styles.verifyButton, { backgroundColor: phoneToken ? colors.muted : colors.primary, opacity: verifyingCode ? 0.6 : 1 }]}>
            {verifyingCode ? <ActivityIndicator size="small" color={colors.primaryForeground} /> : <Text style={[styles.verifyButtonText, { color: phoneToken ? colors.mutedForeground : colors.primaryForeground }]}>{phoneToken ? "Verified" : "Verify"}</Text>}
          </Pressable>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>BUSINESS DETAILS</Text>
        <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Business or firm name</Text>
        <TextInput value={businessName} onChangeText={setBusinessName} style={inputStyle} placeholder="Optional" placeholderTextColor={colors.mutedForeground} autoCapitalize="words" />
        <View style={[styles.switchRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <View style={styles.switchCopy}>
            <Text style={[styles.fieldLabel, { color: colors.foreground, marginBottom: 2 }]}>Registered firm</Text>
            <Text style={[styles.helper, { color: colors.mutedForeground }]}>Use your business documents for a verified account.</Text>
          </View>
          <Switch value={isRegisteredFirm} onValueChange={setIsRegisteredFirm} trackColor={{ false: colors.muted, true: colors.primary }} />
        </View>
        {isRegisteredFirm && (
          <View style={styles.choiceRow}>
            {(["business_name", "registered_company"] as const).map((value) => (
              <Pressable key={value} onPress={() => setFirmType(value)} style={[styles.choice, { borderColor: firmType === value ? colors.primary : colors.border, backgroundColor: firmType === value ? colors.primary + "14" : colors.card }]}>
                <Text style={[styles.choiceText, { color: colors.foreground }]}>{value === "business_name" ? "Business name" : "Registered company"}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <Pressable disabled={saving} onPress={saveProfile} style={[styles.saveButton, { backgroundColor: colors.primary, opacity: saving ? 0.65 : 1 }]}>
          {saving ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.saveButtonText, { color: colors.primaryForeground }]}>Save changes</Text>}
        </Pressable>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  header: { height: 68, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: StyleSheet.hairlineWidth },
  backButton: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontFamily: "Outfit_700Bold" },
  content: { padding: 20, gap: 10 },
  sectionTitle: { fontSize: 11, letterSpacing: 0.9, fontFamily: "Outfit_600SemiBold", marginTop: 12 },
  fieldLabel: { fontSize: 14, fontFamily: "Outfit_500Medium", marginTop: 2 },
  helper: { fontSize: 12, lineHeight: 17, fontFamily: "Outfit_400Regular" },
  input: { height: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, fontSize: 15, fontFamily: "Outfit_400Regular" },
  readOnly: { height: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  readOnlyText: { fontSize: 15, fontFamily: "Outfit_400Regular" },
  outlineButton: { height: 44, borderWidth: 1, borderRadius: 10, alignItems: "center", justifyContent: "center", marginTop: 2 },
  outlineButtonText: { fontSize: 14, fontFamily: "Outfit_600SemiBold" },
  codeRow: { flexDirection: "row", gap: 8 },
  codeInput: { flex: 1 },
  verifyButton: { width: 88, height: 48, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  verifyButtonText: { fontSize: 14, fontFamily: "Outfit_600SemiBold" },
  switchRow: { borderWidth: 1, borderRadius: 10, padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  switchCopy: { flex: 1 },
  choiceRow: { flexDirection: "row", gap: 8 },
  choice: { flex: 1, minHeight: 48, borderWidth: 1, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  choiceText: { fontSize: 12, textAlign: "center", fontFamily: "Outfit_500Medium" },
  saveButton: { height: 52, borderRadius: 10, marginTop: 18, alignItems: "center", justifyContent: "center" },
  saveButtonText: { fontSize: 15, fontFamily: "Outfit_700Bold" },
});