import { Feather } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

export type VideoCropAspect = "original" | "16:9" | "4:3" | "1:1" | "9:16";
export type CaptionPosition = "top" | "center" | "bottom";

export type ListingVideoEdit = {
  trimStart: number;
  trimEnd: number;
  cropAspect: VideoCropAspect;
  caption: string;
  captionPosition: CaptionPosition;
};

type Props = {
  source: string;
  durationSeconds?: number;
  processing?: boolean;
  onClose: () => void;
  onSave: (edit: ListingVideoEdit) => void;
};

const ASPECT_RATIOS: Record<VideoCropAspect, number | undefined> = {
  original: undefined,
  "16:9": 16 / 9,
  "4:3": 4 / 3,
  "1:1": 1,
  "9:16": 9 / 16,
};

const formatTime = (seconds: number) => {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
};

export function ListingVideoEditor({
  source,
  durationSeconds,
  processing = false,
  onClose,
  onSave,
}: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const maxEnd = Math.max(1, Math.min(durationSeconds ?? 60, 300));
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(Math.min(maxEnd, 60));
  const [cropAspect, setCropAspect] = useState<VideoCropAspect>("original");
  const [caption, setCaption] = useState("");
  const [captionPosition, setCaptionPosition] = useState<CaptionPosition>("bottom");
  const player = useVideoPlayer({ uri: source, contentType: "progressive" }, (videoPlayer) => {
    videoPlayer.loop = true;
  });

  const editDuration = trimEnd - trimStart;
  const isValid = editDuration >= 1 && editDuration <= 60;
  const previewStyle = useMemo(
    () => ({
      ...styles.video,
      aspectRatio: ASPECT_RATIOS[cropAspect],
      width: ASPECT_RATIOS[cropAspect] ? undefined : "100%" as const,
    }),
    [cropAspect],
  );

  const nudgeStart = (amount: number) => {
    setTrimStart((current) => Math.min(Math.max(0, current + amount), trimEnd - 1));
  };
  const nudgeEnd = (amount: number) => {
    setTrimEnd((current) => Math.max(trimStart + 1, Math.min(maxEnd, current + amount)));
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={processing ? undefined : onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.title, { color: colors.foreground }]}>Edit Video</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                Trim, crop, and add a caption before uploading.
              </Text>
            </View>
            <Pressable disabled={processing} onPress={onClose} hitSlop={12}>
              <Feather name="x" size={22} color={colors.foreground} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.previewWrap}>
              <VideoView
                player={player}
                style={previewStyle}
                nativeControls
                allowsFullscreen
                allowsPictureInPicture={false}
                contentFit="cover"
                surfaceType="textureView"
              />
              {caption.trim() ? (
                <View
                  pointerEvents="none"
                  style={[
                    styles.captionPreview,
                    captionPosition === "top"
                      ? styles.captionTop
                      : captionPosition === "center"
                        ? styles.captionCenter
                        : styles.captionBottom,
                  ]}
                >
                  <Text style={styles.captionText}>{caption}</Text>
                </View>
              ) : null}
            </View>

            <View style={[styles.notice, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Feather name="video" size={15} color={colors.foreground} />
              <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>
                Uploads can be up to 5 minutes. The saved edited clip must be 1 minute or less.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.foreground }]}>Trim</Text>
              <Text style={[styles.help, { color: colors.mutedForeground }]}>
                Saved clip: {formatTime(editDuration)} of 1:00 maximum
              </Text>
              <View style={styles.trimRow}>
                <Text style={[styles.trimLabel, { color: colors.mutedForeground }]}>Start</Text>
                <Pressable style={[styles.nudge, { borderColor: colors.border }]} onPress={() => nudgeStart(-1)}>
                  <Feather name="minus" size={15} color={colors.foreground} />
                </Pressable>
                <Text style={[styles.time, { color: colors.foreground }]}>{formatTime(trimStart)}</Text>
                <Pressable style={[styles.nudge, { borderColor: colors.border }]} onPress={() => nudgeStart(1)}>
                  <Feather name="plus" size={15} color={colors.foreground} />
                </Pressable>
              </View>
              <View style={styles.trimRow}>
                <Text style={[styles.trimLabel, { color: colors.mutedForeground }]}>End</Text>
                <Pressable style={[styles.nudge, { borderColor: colors.border }]} onPress={() => nudgeEnd(-1)}>
                  <Feather name="minus" size={15} color={colors.foreground} />
                </Pressable>
                <Text style={[styles.time, { color: colors.foreground }]}>{formatTime(trimEnd)}</Text>
                <Pressable style={[styles.nudge, { borderColor: colors.border }]} onPress={() => nudgeEnd(1)}>
                  <Feather name="plus" size={15} color={colors.foreground} />
                </Pressable>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.foreground }]}>Center crop</Text>
              <View style={styles.options}>
                {(Object.keys(ASPECT_RATIOS) as VideoCropAspect[]).map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => setCropAspect(option)}
                    style={[
                      styles.option,
                      { borderColor: cropAspect === option ? colors.primary : colors.border },
                      cropAspect === option && { backgroundColor: colors.primary },
                    ]}
                  >
                    <Text style={{ color: cropAspect === option ? colors.primaryForeground : colors.foreground, fontFamily: "Outfit_500Medium", fontSize: 12 }}>
                      {option === "original" ? "Original" : option}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.foreground }]}>Caption</Text>
              <TextInput
                value={caption}
                onChangeText={setCaption}
                placeholder="Add a caption (optional)"
                placeholderTextColor={colors.mutedForeground}
                maxLength={160}
                multiline
                style={[styles.captionInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
              />
              <View style={styles.options}>
                {(["top", "center", "bottom"] as CaptionPosition[]).map((position) => (
                  <Pressable
                    key={position}
                    onPress={() => setCaptionPosition(position)}
                    style={[
                      styles.option,
                      { borderColor: captionPosition === position ? colors.primary : colors.border },
                      captionPosition === position && { backgroundColor: colors.primary },
                    ]}
                  >
                    <Text style={{ color: captionPosition === position ? colors.primaryForeground : colors.foreground, fontFamily: "Outfit_500Medium", fontSize: 12, textTransform: "capitalize" }}>
                      {position}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </ScrollView>

          <View
            style={[
              styles.actions,
              {
                borderTopColor: colors.border,
                paddingBottom: Math.max(insets.bottom, 12),
              },
            ]}
          >
            <Pressable disabled={processing} onPress={onClose} style={[styles.cancel, { borderColor: colors.border }]}>
              <Text style={{ color: colors.foreground, fontFamily: "Outfit_600SemiBold" }}>Cancel</Text>
            </Pressable>
            <Pressable
              disabled={processing || !isValid}
              onPress={() => onSave({ trimStart, trimEnd, cropAspect, caption, captionPosition })}
              style={[styles.save, { backgroundColor: colors.primary, opacity: processing || !isValid ? 0.55 : 1 }]}
            >
              {processing ? <ActivityIndicator size="small" color={colors.primaryForeground} /> : <Feather name="check" size={17} color={colors.primaryForeground} />}
              <Text style={{ color: colors.primaryForeground, fontFamily: "Outfit_600SemiBold" }}>
                {processing ? "Saving…" : "Save Edit"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.68)", justifyContent: "flex-end" },
  sheet: { maxHeight: "94%", borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: "hidden" },
  header: { padding: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 1 },
  title: { fontSize: 19, fontFamily: "Outfit_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Outfit_400Regular", marginTop: 2 },
  content: { padding: 16, gap: 18, paddingBottom: 24 },
  previewWrap: { position: "relative", minHeight: 190, backgroundColor: "#000", alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: 12 },
  video: { height: 220, maxWidth: "100%" },
  captionPreview: { position: "absolute", left: 12, right: 12, alignItems: "center" },
  captionTop: { top: 14 },
  captionCenter: { top: "45%" },
  captionBottom: { bottom: 14 },
  captionText: { color: "#fff", backgroundColor: "rgba(0,0,0,0.58)", overflow: "hidden", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, fontFamily: "Outfit_700Bold", fontSize: 13, textAlign: "center" },
  notice: { flexDirection: "row", gap: 8, padding: 11, borderRadius: 10, borderWidth: 1, alignItems: "flex-start" },
  noticeText: { flex: 1, fontSize: 12, fontFamily: "Outfit_400Regular", lineHeight: 17 },
  section: { gap: 9 },
  label: { fontFamily: "Outfit_700Bold", fontSize: 15 },
  help: { fontFamily: "Outfit_400Regular", fontSize: 12, marginTop: -5 },
  trimRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  trimLabel: { fontFamily: "Outfit_500Medium", fontSize: 13, width: 38 },
  nudge: { width: 35, height: 32, alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: 7 },
  time: { width: 52, textAlign: "center", fontFamily: "Outfit_700Bold", fontVariant: ["tabular-nums"] },
  options: { flexDirection: "row", gap: 7, flexWrap: "wrap" },
  option: { borderWidth: 1, minWidth: 52, minHeight: 34, borderRadius: 8, paddingHorizontal: 10, alignItems: "center", justifyContent: "center" },
  captionInput: { borderWidth: 1, borderRadius: 9, minHeight: 70, paddingHorizontal: 11, paddingVertical: 10, fontFamily: "Outfit_400Regular", fontSize: 13, textAlignVertical: "top" },
  actions: { flexDirection: "row", gap: 10, paddingHorizontal: 15, paddingTop: 12, borderTopWidth: 1 },
  cancel: { flex: 1, minWidth: 0, height: 44, paddingHorizontal: 12, borderRadius: 9, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  save: { flex: 1, height: 44, borderRadius: 9, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" },
});