import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { useTheme, ThemePreference } from "@/context/ThemeContext";
import { getApiBaseUrl } from "@/utils/api";
import { getImageUrl } from "@/utils/imageUrl";

type DocumentUser = NonNullable<ReturnType<typeof useAuth>["user"]>;

function DocumentUploadRow({
  label,
  hint,
  path,
  busy,
  colors,
  onPress,
}: {
  label: string;
  hint: string;
  path?: string | null;
  busy: boolean;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
}) {
  const imageUrl = path ? getImageUrl(path) : "";
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={[
        styles.documentRow,
        {
          borderColor: path ? colors.primary : colors.border,
          backgroundColor: colors.card,
          opacity: busy ? 0.65 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${path ? "Replace" : "Upload"} ${label}`}
    >
      {busy ? (
        <ActivityIndicator color={colors.primary} />
      ) : path && imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.documentThumb} resizeMode="cover" />
      ) : (
        <View style={[styles.documentIcon, { backgroundColor: colors.muted }]}>
          <Feather name={path ? "file-text" : "upload-cloud"} size={20} color={colors.primary} />
        </View>
      )}
      <View style={styles.documentCopy}>
        <Text style={[styles.documentLabel, { color: colors.foreground }]}>{label}</Text>
        <Text style={[styles.documentHint, { color: colors.mutedForeground }]}>
          {busy ? "Uploading…" : path ? "Uploaded · tap to replace" : hint}
        </Text>
      </View>
      <Feather name={path ? "refresh-cw" : "plus"} size={18} color={colors.mutedForeground} />
    </Pressable>
  );
}

// ── Appearance picker ─────────────────────────────────────────────────────────
const THEME_OPTIONS: { label: string; value: ThemePreference; icon: React.ComponentProps<typeof Feather>["name"] }[] = [
  { label: "Light", value: "light", icon: "sun" },
  { label: "Dark", value: "dark", icon: "moon" },
  { label: "System", value: "system", icon: "smartphone" },
];

export default function ProfileSettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, token, updateUser } = useAuth();
  const { preference, setPreference } = useTheme();

  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [businessName, setBusinessName] = useState(user?.businessName ?? "");
  const [isRegisteredFirm, setIsRegisteredFirm] = useState(Boolean(user?.isRegisteredFirm));
  const [firmType, setFirmType] = useState<"business_name" | "registered_company">(
    user?.firmType === "registered_company" ? "registered_company" : "business_name"
  );
  const [idFrontPath, setIdFrontPath] = useState<string | null>(user?.idFront ?? null);
  const [idBackPath, setIdBackPath] = useState<string | null>(user?.idBack ?? null);
  const [firmCertRegPath, setFirmCertRegPath] = useState<string | null>(user?.firmCertRegistration ?? null);
  const [firmCertIncPath, setFirmCertIncPath] = useState<string | null>(user?.firmCertIncorporation ?? null);
  const [firmCr12Path, setFirmCr12Path] = useState<string | null>(user?.firmCr12 ?? null);
  const [firmDirectorIdPaths, setFirmDirectorIdPaths] = useState<string[]>(user?.firmDirectorIds ?? []);
  const [businessCertPath, setBusinessCertPath] = useState<string | null>(user?.businessCertRegistration ?? null);
  const [businessPermitPath, setBusinessPermitPath] = useState<string | null>(user?.businessPermit ?? null);
  const [uploadingDocument, setUploadingDocument] = useState<string | null>(null);
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

  const uploadDocument = async (
    key: string,
    profileField: keyof DocumentUser,
    setPath: (path: string) => void,
    currentArray?: string[],
    arrayMode?: "append" | number,
  ) => {
    // launchImageLibraryAsync opens the system Photo Picker on Android.
    // Do not request broad READ_MEDIA_* permissions for document uploads.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > 20 * 1024 * 1024) {
      Alert.alert("File too large", "Please choose an image smaller than 20 MB.");
      return;
    }

    setUploadingDocument(key);
    try {
      const filename = asset.fileName || asset.uri.split("/").pop() || `${key}.jpg`;
      const extension = filename.split(".").pop()?.toLowerCase() || "jpg";
      const mimeType = asset.mimeType?.startsWith("image/")
        ? asset.mimeType
        : extension === "png" ? "image/png" : "image/jpeg";
      const formData = new FormData();
      formData.append("file", { uri: asset.uri, name: filename, type: mimeType } as never);

      const uploadResponse = await fetch(`${getApiBaseUrl()}/api/storage/objects`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const uploadPayload = await uploadResponse.json() as { path?: string; url?: string; error?: string };
      if (!uploadResponse.ok) throw new Error(uploadPayload.error ?? "The document could not be uploaded");
      const objectPath = uploadPayload.path || uploadPayload.url;
      if (!objectPath) throw new Error("The upload did not return a document path");

      let value: string | string[] = objectPath;
      if (arrayMode === "append") {
        value = [...(currentArray ?? []), objectPath];
      } else if (typeof arrayMode === "number") {
        value = [...(currentArray ?? [])];
        value[arrayMode] = objectPath;
      }
      const profileResponse = await fetch(`${getApiBaseUrl()}/api/auth/profile`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ [profileField]: value }),
      });
      const profilePayload = await profileResponse.json() as DocumentUser & { error?: string };
      if (!profileResponse.ok) throw new Error(profilePayload.error ?? "The document could not be saved");

      if (arrayMode !== undefined) {
        setFirmDirectorIdPaths(value as string[]);
      } else {
        setPath(objectPath);
      }
      await updateUser(profilePayload);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Document saved", `${key} has been uploaded successfully.`);
    } catch (error) {
      Alert.alert("Upload failed", error instanceof Error ? error.message : "Try again.");
    } finally {
      setUploadingDocument(null);
    }
  };

  const removeDirectorId = async (index: number) => {
    const updated = firmDirectorIdPaths.filter((_, itemIndex) => itemIndex !== index);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/auth/profile`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ firmDirectorIds: updated }),
      });
      const payload = await response.json() as DocumentUser & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not remove document");
      setFirmDirectorIdPaths(updated);
      await updateUser(payload);
    } catch (error) {
      Alert.alert("Could not remove document", error instanceof Error ? error.message : "Try again.");
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

  const handleThemeChoice = async (pref: ThemePreference) => {
    Haptics.selectionAsync();
    await setPreference(pref);
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
        {/* ── Appearance ─────────────────────────────────────────────────── */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>APPEARANCE</Text>
        <View style={[styles.themeRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
          {THEME_OPTIONS.map((opt) => {
            const active = preference === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => handleThemeChoice(opt.value)}
                style={[
                  styles.themeOption,
                  {
                    backgroundColor: active ? colors.primary : "transparent",
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Feather
                  name={opt.icon}
                  size={16}
                  color={active ? colors.primaryForeground : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.themeLabel,
                    { color: active ? colors.primaryForeground : colors.foreground },
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── Personal details ───────────────────────────────────────────── */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>PERSONAL DETAILS</Text>
        <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Full name</Text>
        <TextInput value={name} onChangeText={setName} style={inputStyle} placeholder="Your name" placeholderTextColor={colors.mutedForeground} autoCapitalize="words" />
        <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Email</Text>
        <View style={[styles.readOnly, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Text style={[styles.readOnlyText, { color: colors.mutedForeground }]}>{user.email}</Text>
          <Feather name="lock" size={14} color={colors.mutedForeground} />
        </View>

        {/* ── Phone verification ─────────────────────────────────────────── */}
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

        {/* ── Business details ───────────────────────────────────────────── */}
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

        {/* ── Verification documents ─────────────────────────────────────── */}
        {!isRegisteredFirm ? (
          <>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>IDENTITY DOCUMENTS</Text>
            <Text style={[styles.helper, { color: colors.mutedForeground }]}>
              Upload clear photos or scans of both sides of your Kenyan National ID.
            </Text>
            <DocumentUploadRow
              label="National ID — front side"
              hint="Tap to upload a clear photo"
              path={idFrontPath}
              busy={uploadingDocument === "idFront"}
              colors={colors}
              onPress={() => uploadDocument("ID front", "idFront", setIdFrontPath)}
            />
            <DocumentUploadRow
              label="National ID — back side"
              hint="Tap to upload a clear photo"
              path={idBackPath}
              busy={uploadingDocument === "idBack"}
              colors={colors}
              onPress={() => uploadDocument("ID back", "idBack", setIdBackPath)}
            />
            {idFrontPath && idBackPath ? (
              <Text style={[styles.documentStatus, { color: colors.primary }]}>✓ Both ID sides uploaded</Text>
            ) : (
              <Text style={[styles.documentStatus, { color: colors.mutedForeground }]}>Both sides are required for verification.</Text>
            )}
          </>
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>FIRM DOCUMENTS</Text>
            <Text style={[styles.helper, { color: colors.mutedForeground }]}>
              Upload clear photos or scans of the documents for your selected firm type.
            </Text>
            {firmType === "business_name" ? (
              <DocumentUploadRow
                label="Certificate of Registration"
                hint="Issued by the Registrar of Business Names"
                path={firmCertRegPath}
                busy={uploadingDocument === "firmCertRegistration"}
                colors={colors}
                onPress={() => uploadDocument("Certificate of Registration", "firmCertRegistration", setFirmCertRegPath)}
              />
            ) : (
              <>
                <DocumentUploadRow
                  label="Certificate of Incorporation"
                  hint="Tap to upload a clear photo or scan"
                  path={firmCertIncPath}
                  busy={uploadingDocument === "firmCertIncorporation"}
                  colors={colors}
                  onPress={() => uploadDocument("Certificate of Incorporation", "firmCertIncorporation", setFirmCertIncPath)}
                />
                <DocumentUploadRow
                  label="CR12 Certificate"
                  hint="Official list of directors"
                  path={firmCr12Path}
                  busy={uploadingDocument === "firmCr12"}
                  colors={colors}
                  onPress={() => uploadDocument("CR12 certificate", "firmCr12", setFirmCr12Path)}
                />
                <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Director ID documents</Text>
                {firmDirectorIdPaths.map((path, index) => (
                  <View key={`${path}-${index}`} style={styles.directorRow}>
                    <DocumentUploadRow
                      label={`Director ${index + 1} ID`}
                      hint="Uploaded document"
                      path={path}
                      busy={false}
                      colors={colors}
                      onPress={() => uploadDocument(`Director ${index + 1} ID`, "firmDirectorIds", () => undefined, firmDirectorIdPaths, index)}
                    />
                    <Pressable
                      onPress={() => removeDirectorId(index)}
                      style={[styles.removeDocumentButton, { borderColor: colors.border }]}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove director ${index + 1} ID`}
                    >
                      <Feather name="trash-2" size={15} color={colors.destructive} />
                    </Pressable>
                  </View>
                ))}
                <DocumentUploadRow
                  label="Add director ID"
                  hint="Upload a National ID or passport for a director"
                  busy={uploadingDocument === "firmDirectorIds"}
                  colors={colors}
                  onPress={() => uploadDocument("Director ID", "firmDirectorIds", () => undefined, firmDirectorIdPaths, "append")}
                />
              </>
            )}
          </>
        )}

        {/* Website-equivalent optional business documents for owners and hosts */}
        {(user.role === "owner" || user.role === "host") && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>BUSINESS DOCUMENTS (OPTIONAL)</Text>
            <Text style={[styles.helper, { color: colors.mutedForeground }]}>
              Add a registration certificate or business permit to build trust with guests and tenants.
            </Text>
            <DocumentUploadRow
              label="Business registration certificate"
              hint="Tap to upload a clear photo or scan"
              path={businessCertPath}
              busy={uploadingDocument === "businessCertRegistration"}
              colors={colors}
              onPress={() => uploadDocument("Business registration certificate", "businessCertRegistration", setBusinessCertPath)}
            />
            <DocumentUploadRow
              label="Business permit"
              hint="Tap to upload a clear photo or scan"
              path={businessPermitPath}
              busy={uploadingDocument === "businessPermit"}
              colors={colors}
              onPress={() => uploadDocument("Business permit", "businessPermit", setBusinessPermitPath)}
            />
          </>
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
  // Appearance / theme selector
  themeRow: { flexDirection: "row", gap: 8, borderWidth: 1, borderRadius: 10, padding: 8 },
  themeOption: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
  themeLabel: { fontSize: 13, fontFamily: "Outfit_500Medium" },
  documentRow: { minHeight: 68, borderWidth: 1, borderStyle: "dashed", borderRadius: 10, padding: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  documentThumb: { width: 48, height: 48, borderRadius: 7 },
  documentIcon: { width: 48, height: 48, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  documentCopy: { flex: 1, gap: 3 },
  documentLabel: { fontSize: 13, fontFamily: "Outfit_600SemiBold" },
  documentHint: { fontSize: 11, lineHeight: 15, fontFamily: "Outfit_400Regular" },
  documentStatus: { fontSize: 12, fontFamily: "Outfit_500Medium" },
  directorRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  removeDocumentButton: { width: 38, height: 38, borderWidth: 1, borderRadius: 8, alignItems: "center", justifyContent: "center" },
});
