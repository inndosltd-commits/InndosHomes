import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { getApiBaseUrl } from "@/utils/api";

type UpgradeRole = "owner" | "host";

interface AccountUpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AccountUpgradeModal({ visible, onClose, onSuccess }: AccountUpgradeModalProps) {
  const colors = useColors();
  const { token, updateUser } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UpgradeRole | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleClose = () => {
    if (isUpgrading) return;
    setSelectedRole(null);
    setErrorMessage(null);
    onClose();
  };

  const handleUpgrade = async () => {
    if (!selectedRole || !token) return;
    setIsUpgrading(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/auth/profile`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: selectedRole }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Could not switch account");
      }
      await updateUser(payload);
      setSelectedRole(null);
      setErrorMessage(null);
      onClose();
      onSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Please try again.";
      setErrorMessage(message);
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={[styles.title, { color: colors.foreground }]}>Switch Account to List a Property</Text>
              <Text style={[styles.description, { color: colors.mutedForeground }]}>
                Tenant accounts can't list properties. Choose the account type that fits you best.
              </Text>
            </View>
            <Pressable onPress={handleClose} disabled={isUpgrading} hitSlop={12}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <View style={styles.options}>
            <RoleOption
              role="owner"
              title="Property Owner"
              icon="home"
              description="List your own properties, receive link-up requests, and manage bookings."
              selectedRole={selectedRole}
              onSelect={setSelectedRole}
              colors={colors}
            />
            <RoleOption
              role="host"
              title="Host / Agency"
              icon="users"
              description="List properties for others, register a firm, and manage client listings."
              selectedRole={selectedRole}
              onSelect={setSelectedRole}
              colors={colors}
            />
          </View>

          {selectedRole && (
            <Text style={[styles.selection, { color: colors.mutedForeground }]}>
              You're switching to:{" "}
              <Text style={{ color: colors.foreground, fontFamily: "Outfit_600SemiBold" }}>
                {selectedRole === "owner" ? "Property Owner" : "Host / Agency"}
              </Text>
            </Text>
          )}
          {errorMessage && (
            <Text style={[styles.errorText, { color: colors.destructive }]}>{errorMessage}</Text>
          )}

          <View style={styles.footer}>
            <Pressable
              style={[styles.cancelButton, { borderColor: colors.border }]}
              onPress={handleClose}
              disabled={isUpgrading}
            >
              <Text style={[styles.cancelText, { color: colors.foreground }]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.confirmButton, { backgroundColor: colors.primary, opacity: selectedRole && !isUpgrading ? 1 : 0.5 }]}
              onPress={() => void handleUpgrade()}
              disabled={!selectedRole || isUpgrading}
            >
              {isUpgrading ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <Text style={[styles.confirmText, { color: colors.primaryForeground }]}>Switch & List</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function RoleOption({
  role,
  title,
  icon,
  description,
  selectedRole,
  onSelect,
  colors,
}: {
  role: UpgradeRole;
  title: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  description: string;
  selectedRole: UpgradeRole | null;
  onSelect: (role: UpgradeRole) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const selected = selectedRole === role;
  return (
    <Pressable
      style={[
        styles.option,
        { borderColor: selected ? colors.foreground : colors.border, backgroundColor: selected ? colors.muted : colors.card },
      ]}
      onPress={() => onSelect(role)}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.muted }]}>
        <Feather name={icon} size={19} color={colors.foreground} />
      </View>
      <View style={styles.optionCopy}>
        <Text style={[styles.optionTitle, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.optionDescription, { color: colors.mutedForeground }]}>{description}</Text>
      </View>
      {selected && <Feather name="check-circle" size={19} color={colors.primary} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  card: { width: "100%", maxWidth: 520, alignSelf: "center", borderWidth: 1, borderRadius: 18, padding: 20 },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  headerCopy: { flex: 1 },
  title: { fontSize: 21, fontFamily: "Outfit_700Bold", lineHeight: 27 },
  description: { fontSize: 14, fontFamily: "Outfit_400Regular", lineHeight: 20, marginTop: 8 },
  options: { gap: 10, marginTop: 18 },
  option: { flexDirection: "row", alignItems: "center", gap: 11, borderWidth: 2, borderRadius: 14, padding: 13 },
  iconWrap: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  optionCopy: { flex: 1, gap: 3 },
  optionTitle: { fontSize: 15, fontFamily: "Outfit_600SemiBold" },
  optionDescription: { fontSize: 12, fontFamily: "Outfit_400Regular", lineHeight: 17 },
  selection: { fontSize: 12, fontFamily: "Outfit_400Regular", marginTop: 12 },
  errorText: { fontSize: 12, fontFamily: "Outfit_500Medium", lineHeight: 17, marginTop: 10 },
  footer: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 20 },
  cancelButton: { minWidth: 90, alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 15 },
  cancelText: { fontSize: 14, fontFamily: "Outfit_500Medium" },
  confirmButton: { minWidth: 125, alignItems: "center", justifyContent: "center", borderRadius: 10, paddingVertical: 12, paddingHorizontal: 15 },
  confirmText: { fontSize: 14, fontFamily: "Outfit_600SemiBold" },
});