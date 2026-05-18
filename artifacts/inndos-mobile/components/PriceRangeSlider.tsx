import React, { useRef } from "react";
import { PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface PriceRangeSliderProps {
  min: number;
  max: number;
  low: number;
  high: number;
  onLowChange: (value: number) => void;
  onHighChange: (value: number) => void;
  onReset?: () => void;
}

const THUMB = 22;
const TRACK_H = 40;
const LINE_H = 4;
const THUMB_TOP = (TRACK_H - THUMB) / 2;
const LINE_TOP = (TRACK_H - LINE_H) / 2;

function fmt(n: number): string {
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}M`;
  }
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return n.toLocaleString();
}

function getStep(range: number): number {
  if (range === 0) return 1;
  const raw = range / 50;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  return Math.ceil(raw / mag) * mag;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(v, hi));
}

export function PriceRangeSlider({
  min,
  max,
  low,
  high,
  onLowChange,
  onHighChange,
  onReset,
}: PriceRangeSliderProps) {
  const colors = useColors();
  const trackW = useRef(0);

  const lowRef = useRef(low);
  lowRef.current = low;
  const highRef = useRef(high);
  highRef.current = high;
  const minRef = useRef(min);
  minRef.current = min;
  const maxRef = useRef(max);
  maxRef.current = max;

  const lowStart = useRef(0);
  const highStart = useRef(0);

  const toPct = (v: number) => {
    const range = maxRef.current - minRef.current;
    if (range === 0) return 0;
    return clamp((v - minRef.current) / range, 0, 1);
  };

  const fromPct = (p: number) =>
    minRef.current + p * (maxRef.current - minRef.current);

  const snapVal = (v: number) => {
    const s = getStep(maxRef.current - minRef.current);
    return Math.round(v / s) * s;
  };

  const lowPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        lowStart.current = lowRef.current;
      },
      onPanResponderMove: (_, gs) => {
        if (trackW.current === 0) return;
        const startP = toPct(lowStart.current);
        const highP = toPct(highRef.current);
        const newP = clamp(startP + gs.dx / trackW.current, 0, highP - 0.01);
        const newVal = clamp(
          snapVal(fromPct(newP)),
          minRef.current,
          highRef.current - getStep(maxRef.current - minRef.current)
        );
        onLowChange(newVal);
      },
    })
  ).current;

  const highPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        highStart.current = highRef.current;
      },
      onPanResponderMove: (_, gs) => {
        if (trackW.current === 0) return;
        const startP = toPct(highStart.current);
        const lowP = toPct(lowRef.current);
        const newP = clamp(startP + gs.dx / trackW.current, lowP + 0.01, 1);
        const newVal = clamp(
          snapVal(fromPct(newP)),
          lowRef.current + getStep(maxRef.current - minRef.current),
          maxRef.current
        );
        onHighChange(newVal);
      },
    })
  ).current;

  if (min === max) return null;

  const lowPct = toPct(low);
  const highPct = toPct(high);
  const isFiltered = low > min || high < max;
  const fillLeft = lowPct * 100;
  const fillRight = (1 - highPct) * 100;

  return (
    <View style={styles.wrapper}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          KES {fmt(low)}
        </Text>
        <View style={styles.centerGroup}>
          <Text
            style={[
              styles.centerLabel,
              { color: isFiltered ? colors.primary : colors.mutedForeground },
            ]}
          >
            {isFiltered ? "Price filtered" : "Price range"}
          </Text>
          {isFiltered && onReset && (
            <Pressable onPress={onReset} hitSlop={8}>
              <Text style={[styles.resetLabel, { color: colors.primary }]}>
                Reset
              </Text>
            </Pressable>
          )}
        </View>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          KES {fmt(high)}
        </Text>
      </View>

      <View
        style={[styles.trackArea]}
        onLayout={(e) => {
          trackW.current = e.nativeEvent.layout.width;
        }}
      >
        <View
          style={[
            styles.trackBg,
            { backgroundColor: colors.border, top: LINE_TOP },
          ]}
        />
        <View
          style={[
            styles.fill,
            {
              backgroundColor: colors.primary,
              top: LINE_TOP,
              left: `${fillLeft}%`,
              right: `${fillRight}%`,
            },
          ]}
        />
        <View
          {...lowPan.panHandlers}
          style={[
            styles.thumb,
            {
              backgroundColor: colors.background,
              borderColor: colors.primary,
              top: THUMB_TOP,
              left: `${lowPct * 100}%`,
              marginLeft: -THUMB / 2,
            },
          ]}
        />
        <View
          {...highPan.panHandlers}
          style={[
            styles.thumb,
            {
              backgroundColor: colors.background,
              borderColor: colors.primary,
              top: THUMB_TOP,
              left: `${highPct * 100}%`,
              marginLeft: -THUMB / 2,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 2,
    gap: 4,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 12,
    fontFamily: "Outfit_400Regular",
  },
  centerGroup: {
    alignItems: "center",
    gap: 2,
  },
  centerLabel: {
    fontSize: 11,
    fontFamily: "Outfit_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  resetLabel: {
    fontSize: 11,
    fontFamily: "Outfit_400Regular",
    textDecorationLine: "underline",
  },
  trackArea: {
    height: TRACK_H,
    position: "relative",
  },
  trackBg: {
    position: "absolute",
    left: 0,
    right: 0,
    height: LINE_H,
    borderRadius: LINE_H / 2,
  },
  fill: {
    position: "absolute",
    height: LINE_H,
    borderRadius: LINE_H / 2,
  },
  thumb: {
    position: "absolute",
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
});
