import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { getApiBaseUrl } from "@/utils/api";

type CalendarEntry = {
  id: string;
  startDate: string;
  endDate: string;
  note?: string | null;
  bookingId?: string | null;
};

type LinkUp = {
  id: string;
  startDate?: string;
  endDate?: string;
  checkIn?: string;
  checkOut?: string;
  guestName?: string;
  tenantName?: string;
  status?: string;
};

type CalendarData = {
  property?: { title?: string };
  entries: CalendarEntry[];
  linkUps: LinkUp[];
};

function dateOnly(value: string): string {
  return value.slice(0, 10);
}

function linkUpLabel(linkUp: LinkUp): string {
  const person = linkUp.guestName ?? linkUp.tenantName ?? "Link-Up";
  const start = linkUp.startDate ?? linkUp.checkIn;
  const end = linkUp.endDate ?? linkUp.checkOut;
  return `${person}${start && end ? ` · ${dateOnly(start)} – ${dateOnly(end)}` : ""}`;
}

export default function ManagementCalendarScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [note, setNote] = useState("");
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const api = useCallback(async (path: string, method = "GET", body?: unknown) => {
    if (!token) throw new Error("Please sign in again to manage dates.");
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) {
      const responseBody = await response.json().catch(() => null) as { error?: string; message?: string } | null;
      throw new Error(responseBody?.error ?? responseBody?.message ?? "The request could not be completed.");
    }
    return response.status === 204 ? null : response.json();
  }, [token]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setData(await api(`/api/properties/${id}/management-calendar`) as CalendarData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load the management calendar.");
    } finally {
      setLoading(false);
    }
  }, [api, id]);

  useEffect(() => { void load(); }, [load]);

  const closeForm = () => {
    setFormOpen(false);
    setStartDate("");
    setEndDate("");
    setNote("");
    setBookingId(null);
  };

  const saveEntry = async () => {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(startDate) || !datePattern.test(endDate)) {
      Alert.alert("Enter valid dates", "Use YYYY-MM-DD for both the start and end date.");
      return;
    }
    if (startDate > endDate) {
      Alert.alert("Check the dates", "The end date must be on or after the start date.");
      return;
    }
    setSaving(true);
    try {
      await api(`/api/properties/${id}/management-calendar`, "POST", {
        startDate, endDate, note: note.trim() || undefined, bookingId: bookingId ?? undefined,
      });
      closeForm();
      await load();
    } catch (saveError) {
      Alert.alert("Could not save dates", saveError instanceof Error ? saveError.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = (entry: CalendarEntry) => {
    Alert.alert("Delete management dates?", "This removes this private management record only.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: () => void (async () => {
          setDeletingId(entry.id);
          try {
            await api(`/api/properties/${id}/management-calendar/${entry.id}`, "DELETE");
            await load();
          } catch (deleteError) {
            Alert.alert("Could not delete dates", deleteError instanceof Error ? deleteError.message : "Please try again.");
          } finally {
            setDeletingId(null);
          }
        })(),
      },
    ]);
  };

  const topPadding = isWeb ? 67 : insets.top;
  const bottomPadding = isWeb ? 34 : insets.bottom;
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12, borderBottomColor: colors.border }]}>
        <Pressable testID="management-calendar-back" onPress={() => router.back()} style={styles.iconButton}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: colors.foreground }]}>Management calendar</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]} numberOfLines={1}>{data?.property?.title ?? "Private owner records"}</Text>
        </View>
      </View>

      <KeyboardAwareScrollViewCompat
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding + 32 }]}
        bottomOffset={20}
      >
        <View style={[styles.privateNotice, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="lock" size={17} color={colors.primary} />
          <Text style={[styles.noticeText, { color: colors.foreground }]}>
            Private to you. These dates do not affect customers or Link-Ups.
          </Text>
        </View>

        <Pressable testID="add-management-dates" onPress={() => setFormOpen(true)} style={[styles.addButton, { backgroundColor: colors.primary }]}>
          <Feather name="plus" size={17} color={colors.primaryForeground} />
          <Text style={[styles.addButtonText, { color: colors.primaryForeground }]}>Add management dates</Text>
        </Pressable>

        {loading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /></View> : error ? (
          <View style={styles.center}>
            <Feather name="alert-circle" size={28} color="#dc2626" />
            <Text style={[styles.errorText, { color: colors.foreground }]}>{error}</Text>
            <Pressable onPress={() => void load()}><Text style={[styles.retryText, { color: colors.primary }]}>Try again</Text></Pressable>
          </View>
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Management records</Text>
            {data?.entries.length ? data.entries.map((entry) => (
              <View key={entry.id} style={[styles.entry, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.entryCopy}>
                  <Text style={[styles.entryDates, { color: colors.foreground }]}>{dateOnly(entry.startDate)} – {dateOnly(entry.endDate)}</Text>
                  {!!entry.note && <Text style={[styles.entryNote, { color: colors.mutedForeground }]}>{entry.note}</Text>}
                  {!!entry.bookingId && <Text style={[styles.entryLink, { color: colors.primary }]}>Linked to a Link-Up</Text>}
                </View>
                <Pressable testID={`delete-management-entry-${entry.id}`} disabled={deletingId === entry.id} onPress={() => deleteEntry(entry)} style={styles.deleteButton}>
                  {deletingId === entry.id ? <ActivityIndicator size="small" color="#dc2626" /> : <Feather name="trash-2" size={17} color="#dc2626" />}
                </Pressable>
              </View>
            )) : <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No private management dates recorded yet.</Text>}

            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Current & historical Link-Ups</Text>
            {data?.linkUps.length ? data.linkUps.map((linkUp) => (
              <View key={linkUp.id} style={[styles.linkUp, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="link" size={16} color={colors.primary} />
                <View style={styles.entryCopy}>
                  <Text style={[styles.entryDates, { color: colors.foreground }]}>{linkUpLabel(linkUp)}</Text>
                  {!!linkUp.status && <Text style={[styles.entryNote, { color: colors.mutedForeground }]}>{linkUp.status}</Text>}
                </View>
              </View>
            )) : <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>There are no Link-Ups for this listing.</Text>}
          </>
        )}
      </KeyboardAwareScrollViewCompat>

      <Modal visible={formOpen} transparent animationType="slide" onRequestClose={closeForm}>
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.backdropTap} onPress={closeForm} />
          <KeyboardAwareScrollViewCompat contentContainerStyle={[styles.sheet, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: bottomPadding + 20 }]} bottomOffset={20}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Add management dates</Text>
              <Pressable onPress={closeForm} style={styles.iconButton}><Feather name="x" size={21} color={colors.mutedForeground} /></Pressable>
            </View>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Start date</Text>
            <TextInput value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} />
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>End date</Text>
            <TextInput value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} />
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Optional Link-Up</Text>
            <View style={styles.chips}>
              <Pressable onPress={() => setBookingId(null)} style={[styles.chip, { borderColor: colors.border, backgroundColor: bookingId === null ? colors.primary : "transparent" }]}><Text style={[styles.chipText, { color: bookingId === null ? colors.primaryForeground : colors.foreground }]}>None</Text></Pressable>
              {data?.linkUps.map((linkUp) => <Pressable key={linkUp.id} onPress={() => setBookingId(linkUp.id)} style={[styles.chip, { borderColor: colors.border, backgroundColor: bookingId === linkUp.id ? colors.primary : "transparent" }]}><Text numberOfLines={1} style={[styles.chipText, { color: bookingId === linkUp.id ? colors.primaryForeground : colors.foreground }]}>{linkUpLabel(linkUp)}</Text></Pressable>)}
            </View>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Notes (optional)</Text>
            <TextInput value={note} onChangeText={setNote} multiline placeholder="Add a private note" placeholderTextColor={colors.mutedForeground} style={[styles.input, styles.notesInput, { color: colors.foreground, borderColor: colors.border }]} />
            <Pressable disabled={saving} onPress={() => void saveEntry()} style={[styles.addButton, { backgroundColor: colors.primary, opacity: saving ? 0.65 : 1 }]}>{saving ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.addButtonText, { color: colors.primaryForeground }]}>Save dates</Text>}</Pressable>
          </KeyboardAwareScrollViewCompat>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  iconButton: { padding: 6 }, headerCopy: { flex: 1 }, title: { fontSize: 21, fontFamily: "Outfit_700Bold" }, subtitle: { fontSize: 12, fontFamily: "Outfit_400Regular", marginTop: 2 },
  scroll: { flex: 1 }, content: { padding: 20, gap: 12 }, privateNotice: { flexDirection: "row", gap: 10, padding: 13, borderWidth: 1 }, noticeText: { flex: 1, fontSize: 13, lineHeight: 18, fontFamily: "Outfit_500Medium" },
  addButton: { minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 16 }, addButtonText: { fontSize: 14, fontFamily: "Outfit_600SemiBold" },
  center: { alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 42 }, errorText: { textAlign: "center", fontSize: 14, fontFamily: "Outfit_400Regular" }, retryText: { fontSize: 14, fontFamily: "Outfit_600SemiBold" },
  sectionTitle: { marginTop: 10, fontSize: 16, fontFamily: "Outfit_700Bold" }, entry: { flexDirection: "row", alignItems: "center", borderWidth: 1, padding: 13, gap: 10 }, entryCopy: { flex: 1, gap: 3 },
  entryDates: { fontSize: 14, fontFamily: "Outfit_600SemiBold" }, entryNote: { fontSize: 13, fontFamily: "Outfit_400Regular", lineHeight: 18 }, entryLink: { fontSize: 12, fontFamily: "Outfit_500Medium" },
  deleteButton: { padding: 7 }, emptyText: { fontSize: 13, fontFamily: "Outfit_400Regular", paddingVertical: 8 }, linkUp: { flexDirection: "row", borderWidth: 1, padding: 13, gap: 10 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end" }, backdropTap: { flex: 1, backgroundColor: "rgba(0,0,0,0.42)" }, sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, paddingHorizontal: 20, paddingTop: 16, gap: 8, maxHeight: "90%" },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }, sheetTitle: { fontSize: 18, fontFamily: "Outfit_700Bold" }, fieldLabel: { marginTop: 5, fontSize: 13, fontFamily: "Outfit_600SemiBold" },
  input: { minHeight: 46, borderWidth: 1, paddingHorizontal: 12, fontSize: 15, fontFamily: "Outfit_400Regular" }, notesInput: { minHeight: 82, paddingTop: 11, textAlignVertical: "top" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, chip: { maxWidth: "100%", borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7 }, chipText: { fontSize: 12, fontFamily: "Outfit_500Medium" },
});