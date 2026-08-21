import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

export type BookedRangeStatus = "pending" | "confirmed" | "blocked";
export type BookedRange = {
  startDate: string;
  endDate: string;
  status?: BookedRangeStatus;
};

interface BookingCalendarProps {
  visible: boolean;
  title: string;
  value: Date;
  minDate?: Date;
  bookedRanges?: BookedRange[];
  /**
   * Total number of bookable units for this property. A date is only fully
   * unavailable when the overlapping pending/confirmed bookings reach this
   * capacity, or when a range explicitly blocks the date. Defaults to 1.
   */
  totalUnits?: number;
  /**
   * When true, the start date of a booked range is treated as available
   * (e.g. for check-out: you can check out on the day the next booking starts).
   */
  allowBookedStartDates?: boolean;
  isDateDisabled?: (date: Date) => boolean;
  onSelect: (date: Date) => void;
  onClose: () => void;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function BookingCalendar({
  visible,
  title,
  value,
  minDate,
  bookedRanges = [],
  totalUnits = 1,
  allowBookedStartDates = false,
  isDateDisabled,
  onSelect,
  onClose,
}: BookingCalendarProps) {
  const colors = useColors();
  const today = startOfDay(new Date());

  const [viewYear, setViewYear] = useState(value.getFullYear());
  const [viewMonth, setViewMonth] = useState(value.getMonth());

  useEffect(() => {
    if (visible) {
      setViewYear(value.getFullYear());
      setViewMonth(value.getMonth());
    }
  }, [visible, value]);

  // Whether a specific range covers the given day.
  const rangeCovers = (r: BookedRange, t: number): boolean => {
    const s = startOfDay(new Date(r.startDate)).getTime();
    const e = startOfDay(new Date(r.endDate)).getTime();
    return allowBookedStartDates ? t > s && t < e : t >= s && t < e;
  };

  // A day is unavailable when a blocked range covers it, or when the number of
  // overlapping pending/confirmed bookings reaches the property's capacity.
  const isBooked = (date: Date): boolean => {
    const t = startOfDay(date).getTime();
    const capacity = Math.max(1, totalUnits);
    let occupied = 0;
    for (const r of bookedRanges) {
      if (!rangeCovers(r, t)) continue;
      if (r.status === "blocked") return true;
      // Treat undefined status as an active booking for safety.
      if (r.status === "pending" || r.status === "confirmed" || r.status === undefined) {
        occupied += 1;
      }
    }
    return occupied >= capacity;
  };

  const checkDisabled = (date: Date): boolean => {
    const d = startOfDay(date);
    if (minDate && d.getTime() < startOfDay(minDate).getTime()) return true;
    if (isDateDisabled && isDateDisabled(d)) return true;
    if (isBooked(d)) return true;
    return false;
  };

  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDayNum = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startDow = firstDay.getDay();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= lastDayNum; d++) {
    cells.push(new Date(viewYear, viewMonth, d));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const canGoPrev = (): boolean => {
    const prevMonthDate = new Date(viewYear, viewMonth - 1, 1);
    const minCheck = minDate ? startOfDay(minDate) : today;
    return prevMonthDate.getFullYear() > minCheck.getFullYear() ||
      (prevMonthDate.getFullYear() === minCheck.getFullYear() &&
        prevMonthDate.getMonth() >= minCheck.getMonth());
  };

  const handleDayPress = (date: Date) => {
    if (checkDisabled(date)) return;
    onSelect(startOfDay(date));
    onClose();
  };

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTap} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>{title}</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <View style={styles.monthNav}>
            <Pressable
              onPress={prevMonth}
              disabled={!canGoPrev()}
              style={[styles.navBtn, !canGoPrev() && styles.navBtnDisabled]}
            >
              <Feather
                name="chevron-left"
                size={20}
                color={canGoPrev() ? colors.foreground : colors.mutedForeground}
              />
            </Pressable>
            <Text style={[styles.monthLabel, { color: colors.foreground }]}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </Text>
            <Pressable onPress={nextMonth} style={styles.navBtn}>
              <Feather name="chevron-right" size={20} color={colors.foreground} />
            </Pressable>
          </View>

          <View style={styles.dayLabelsRow}>
            {DAY_LABELS.map((d) => (
              <Text key={d} style={[styles.dayLabel, { color: colors.mutedForeground }]}>
                {d}
              </Text>
            ))}
          </View>

          <ScrollView style={styles.gridScroll} showsVerticalScrollIndicator={false}>
            {weeks.map((week, wi) => (
              <View key={wi} style={styles.weekRow}>
                {week.map((day, di) => {
                  if (!day) {
                    return <View key={di} style={styles.cell} />;
                  }

                  const disabled = checkDisabled(day);
                  const booked = isBooked(day);
                  const selected = isSameDay(day, value);
                  const isToday = isSameDay(day, today);

                  const disabledNotBooked = disabled && !booked && !selected;

                  return (
                    <Pressable
                      key={di}
                      onPress={() => handleDayPress(day)}
                      disabled={disabled}
                      style={[
                        styles.cell,
                        selected && [styles.cellSelected, { backgroundColor: colors.primary }],
                        !selected && booked && styles.cellBooked,
                        !selected && !booked && disabled && styles.cellDisabled,
                        !selected && isToday && !booked && !disabled && [styles.cellToday, { borderColor: colors.primary }],
                      ]}
                    >
                      <Text
                        style={[
                          styles.cellText,
                          { color: colors.foreground },
                          selected && { color: colors.primaryForeground },
                          (booked || disabledNotBooked) && !selected && styles.cellTextDisabled,
                          isToday && !selected && !booked && !disabled && { color: colors.primary, fontFamily: "Outfit_600SemiBold" },
                        ]}
                      >
                        {day.getDate()}
                      </Text>
                      {booked && !selected && (
                        <View style={styles.bookedDot} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </ScrollView>

          <View style={[styles.legend, { borderTopColor: colors.border }]}>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, styles.cellBooked]} />
              <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Already booked</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: "#f0fdf4", borderColor: "#86efac", borderWidth: 1, borderRadius: 6 }]} />
              <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Available</Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdropTap: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    paddingBottom: 32,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Outfit_600SemiBold",
  },
  closeBtn: {
    padding: 4,
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  navBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
  navBtnDisabled: {
    opacity: 0.3,
  },
  monthLabel: {
    fontSize: 16,
    fontFamily: "Outfit_600SemiBold",
  },
  dayLabelsRow: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  dayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Outfit_500Medium",
  },
  gridScroll: {
    paddingHorizontal: 8,
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    position: "relative",
  },
  cellSelected: {
    borderRadius: 8,
  },
  cellBooked: {
    backgroundColor: "#fef2f2",
    borderRadius: 8,
  },
  cellDisabled: {
    opacity: 0.3,
  },
  cellToday: {
    borderWidth: 1.5,
    borderRadius: 8,
  },
  cellText: {
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
  },
  cellTextDisabled: {
    opacity: 0.3,
  },
  bookedDot: {
    position: "absolute",
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#dc2626",
    opacity: 0.7,
  },
  legend: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendSwatch: {
    width: 20,
    height: 20,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    fontFamily: "Outfit_400Regular",
  },
});
