import { useCreateProperty } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

const PROPERTY_TYPES = [
  { label: "For Rent", value: "rent" },
  { label: "For Sale", value: "sale" },
  { label: "BnB / Short Stay", value: "bnb" },
  { label: "Hotel", value: "hotel" },
  { label: "Hostel", value: "hostel" },
] as const;

type PropertyType = (typeof PROPERTY_TYPES)[number]["value"];

interface FormState {
  title: string;
  type: PropertyType;
  price: string;
  address: string;
  beds: string;
  baths: string;
  sqft: string;
  imageUrl: string;
  description: string;
}

const EMPTY_FORM: FormState = {
  title: "",
  type: "rent",
  price: "",
  address: "",
  beds: "",
  baths: "",
  sqft: "",
  imageUrl: "",
  description: "",
};

export default function ListPropertyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const isWeb = Platform.OS === "web";

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitted, setSubmitted] = useState(false);

  const { mutate: createProperty, isPending } = useCreateProperty({
    mutation: {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSubmitted(true);
        setForm(EMPTY_FORM);
        setErrors({});
      },
      onError: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Error", "Failed to submit your listing. Please try again.");
      },
    },
  });

  const topPadding = isWeb ? 67 : insets.top;
  const styles = getStyles(colors);

  const ALLOWED_ROLES = ["owner", "host", "admin"];
  const canList = user && ALLOWED_ROLES.includes(user.role);

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>List a Property</Text>
        </View>
        <View style={styles.guestContainer}>
          <View style={[styles.iconCircle, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="home" size={40} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.guestTitle, { color: colors.foreground }]}>Sign in to list a property</Text>
          <Text style={[styles.guestSubtitle, { color: colors.mutedForeground }]}>
            Only authenticated owners and hosts can add property listings
          </Text>
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Sign In</Text>
          </Pressable>
          <Pressable
            style={[styles.secondaryBtn, { borderColor: colors.border }]}
            onPress={() => router.push("/(auth)/signup")}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>Create Account</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!canList) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>List a Property</Text>
        </View>
        <View style={styles.guestContainer}>
          <View style={[styles.iconCircle, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="lock" size={40} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.guestTitle, { color: colors.foreground }]}>Owner account required</Text>
          <Text style={[styles.guestSubtitle, { color: colors.mutedForeground }]}>
            Only accounts with an owner or host role can list properties. Please contact support to upgrade your account.
          </Text>
        </View>
      </View>
    );
  }

  if (submitted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>List a Property</Text>
        </View>
        <View style={styles.guestContainer}>
          <View style={[styles.iconCircle, { backgroundColor: "#dcfce7", borderColor: "#86efac" }]}>
            <Feather name="check-circle" size={40} color="#16a34a" />
          </View>
          <Text style={[styles.guestTitle, { color: colors.foreground }]}>Listing Submitted!</Text>
          <Text style={[styles.guestSubtitle, { color: colors.mutedForeground }]}>
            Your property has been submitted for review. It will appear in the owner dashboard once approved by an admin.
          </Text>
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={() => setSubmitted(false)}
          >
            <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>List Another Property</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof FormState, string>> = {};

    if (!form.title.trim()) newErrors.title = "Title is required";
    if (!form.address.trim()) newErrors.address = "Address is required";
    if (!form.imageUrl.trim()) newErrors.imageUrl = "At least one image URL is required";

    const price = parseFloat(form.price);
    if (!form.price.trim() || isNaN(price) || price <= 0) {
      newErrors.price = "Enter a valid price";
    }

    if (form.beds && (isNaN(parseInt(form.beds)) || parseInt(form.beds) < 0)) {
      newErrors.beds = "Enter a valid number";
    }
    if (form.baths && (isNaN(parseInt(form.baths)) || parseInt(form.baths) < 0)) {
      newErrors.baths = "Enter a valid number";
    }
    if (form.sqft && (isNaN(parseInt(form.sqft)) || parseInt(form.sqft) < 0)) {
      newErrors.sqft = "Enter a valid number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit() {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const imageList = [form.imageUrl.trim()];

    createProperty({
      data: {
        title: form.title.trim(),
        type: form.type,
        price: parseFloat(form.price),
        address: form.address.trim(),
        ...(form.beds ? { beds: parseInt(form.beds) } : {}),
        ...(form.baths ? { baths: parseInt(form.baths) } : {}),
        ...(form.sqft ? { sqft: parseInt(form.sqft) } : {}),
        ...(form.description.trim() ? { description: form.description.trim() } : {}),
        image: imageList[0],
        images: imageList,
      },
    });
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>List a Property</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Fill in the details below. Your listing goes to admin review before publishing.
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: isWeb ? 34 + 84 : insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <SectionLabel text="Basic Info" colors={colors} />

          <Field label="Property Title *" error={errors.title} colors={colors}>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: errors.title ? colors.destructive : colors.border, backgroundColor: colors.card }]}
              placeholder="e.g. Modern 2BR Apartment in Westlands"
              placeholderTextColor={colors.mutedForeground}
              value={form.title}
              onChangeText={(v) => setField("title", v)}
              returnKeyType="next"
            />
          </Field>

          <Field label="Property Type *" error={undefined} colors={colors}>
            <View style={[styles.typeGrid]}>
              {PROPERTY_TYPES.map((t) => (
                <Pressable
                  key={t.value}
                  style={[
                    styles.typeChip,
                    {
                      borderColor: form.type === t.value ? colors.primary : colors.border,
                      backgroundColor: form.type === t.value ? colors.primary : colors.card,
                    },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setField("type", t.value);
                  }}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      { color: form.type === t.value ? colors.primaryForeground : colors.foreground },
                    ]}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Field>

          <Field label="Price (KES / night or month) *" error={errors.price} colors={colors}>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: errors.price ? colors.destructive : colors.border, backgroundColor: colors.card }]}
              placeholder="e.g. 8500"
              placeholderTextColor={colors.mutedForeground}
              value={form.price}
              onChangeText={(v) => setField("price", v)}
              keyboardType="decimal-pad"
              returnKeyType="next"
            />
          </Field>

          <Field label="Address *" error={errors.address} colors={colors}>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: errors.address ? colors.destructive : colors.border, backgroundColor: colors.card }]}
              placeholder="e.g. 14 Lenana Road, Nairobi"
              placeholderTextColor={colors.mutedForeground}
              value={form.address}
              onChangeText={(v) => setField("address", v)}
              returnKeyType="next"
            />
          </Field>

          <SectionLabel text="Details (optional)" colors={colors} />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field label="Beds" error={errors.beds} colors={colors}>
                <TextInput
                  style={[styles.input, { color: colors.foreground, borderColor: errors.beds ? colors.destructive : colors.border, backgroundColor: colors.card }]}
                  placeholder="e.g. 2"
                  placeholderTextColor={colors.mutedForeground}
                  value={form.beds}
                  onChangeText={(v) => setField("beds", v)}
                  keyboardType="number-pad"
                  returnKeyType="next"
                />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Baths" error={errors.baths} colors={colors}>
                <TextInput
                  style={[styles.input, { color: colors.foreground, borderColor: errors.baths ? colors.destructive : colors.border, backgroundColor: colors.card }]}
                  placeholder="e.g. 1"
                  placeholderTextColor={colors.mutedForeground}
                  value={form.baths}
                  onChangeText={(v) => setField("baths", v)}
                  keyboardType="number-pad"
                  returnKeyType="next"
                />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Sqft" error={errors.sqft} colors={colors}>
                <TextInput
                  style={[styles.input, { color: colors.foreground, borderColor: errors.sqft ? colors.destructive : colors.border, backgroundColor: colors.card }]}
                  placeholder="e.g. 900"
                  placeholderTextColor={colors.mutedForeground}
                  value={form.sqft}
                  onChangeText={(v) => setField("sqft", v)}
                  keyboardType="number-pad"
                  returnKeyType="next"
                />
              </Field>
            </View>
          </View>

          <Field label="Description" error={undefined} colors={colors}>
            <TextInput
              style={[
                styles.input,
                styles.textarea,
                { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card },
              ]}
              placeholder="Describe your property — amenities, location, rules…"
              placeholderTextColor={colors.mutedForeground}
              value={form.description}
              onChangeText={(v) => setField("description", v)}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </Field>

          <SectionLabel text="Photo" colors={colors} />

          <Field label="Image URL *" error={errors.imageUrl} colors={colors}>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: errors.imageUrl ? colors.destructive : colors.border, backgroundColor: colors.card }]}
              placeholder="https://example.com/photo.jpg"
              placeholderTextColor={colors.mutedForeground}
              value={form.imageUrl}
              onChangeText={(v) => setField("imageUrl", v)}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
            />
          </Field>

          <Pressable
            style={[
              styles.submitBtn,
              { backgroundColor: isPending ? colors.muted : colors.primary },
            ]}
            onPress={handleSubmit}
            disabled={isPending}
          >
            {isPending ? (
              <ActivityIndicator size="small" color={colors.mutedForeground} />
            ) : (
              <>
                <Feather name="upload" size={18} color={colors.primaryForeground} />
                <Text style={[styles.submitBtnText, { color: colors.primaryForeground }]}>
                  Submit Listing
                </Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function SectionLabel({ text, colors }: { text: string; colors: ReturnType<typeof useColors> }) {
  return (
    <Text style={[sectionStyles.label, { color: colors.mutedForeground }]}>{text}</Text>
  );
}

const sectionStyles = StyleSheet.create({
  label: {
    fontSize: 11,
    fontFamily: "Outfit_600SemiBold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 2,
    marginTop: 4,
  },
});

function Field({
  label,
  error,
  colors,
  children,
}: {
  label: string;
  error?: string;
  colors: ReturnType<typeof useColors>;
  children: React.ReactNode;
}) {
  return (
    <View style={fieldStyles.wrapper}>
      <Text style={[fieldStyles.label, { color: colors.foreground }]}>{label}</Text>
      {children}
      {error ? (
        <Text style={[fieldStyles.error, { color: colors.destructive }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { fontSize: 13, fontFamily: "Outfit_500Medium" },
  error: { fontSize: 12, fontFamily: "Outfit_400Regular" },
});

function getStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: {
      paddingHorizontal: 20,
      paddingBottom: 12,
      gap: 4,
    },
    title: {
      fontSize: 24,
      fontFamily: "Outfit_700Bold",
    },
    subtitle: {
      fontSize: 13,
      fontFamily: "Outfit_400Regular",
      lineHeight: 18,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 8,
      gap: 16,
    },
    guestContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 14,
      paddingHorizontal: 40,
    },
    iconCircle: {
      width: 88,
      height: 88,
      borderRadius: 44,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      marginBottom: 8,
    },
    guestTitle: {
      fontSize: 22,
      fontFamily: "Outfit_700Bold",
      textAlign: "center",
    },
    guestSubtitle: {
      fontSize: 14,
      fontFamily: "Outfit_400Regular",
      textAlign: "center",
      lineHeight: 20,
    },
    primaryBtn: {
      paddingHorizontal: 48,
      paddingVertical: 14,
      marginTop: 8,
      width: "100%",
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
      gap: 8,
    },
    primaryBtnText: {
      fontSize: 15,
      fontFamily: "Outfit_600SemiBold",
    },
    secondaryBtn: {
      borderWidth: 1,
      paddingHorizontal: 48,
      paddingVertical: 14,
      width: "100%",
      alignItems: "center",
    },
    secondaryBtnText: {
      fontSize: 15,
      fontFamily: "Outfit_500Medium",
    },
    input: {
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      fontFamily: "Outfit_400Regular",
    },
    textarea: {
      height: 100,
      paddingTop: 12,
    },
    row: {
      flexDirection: "row",
      gap: 10,
    },
    typeGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    typeChip: {
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    typeChipText: {
      fontSize: 13,
      fontFamily: "Outfit_500Medium",
    },
    submitBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      paddingVertical: 15,
      marginTop: 8,
    },
    submitBtnText: {
      fontSize: 16,
      fontFamily: "Outfit_600SemiBold",
    },
  });
}
