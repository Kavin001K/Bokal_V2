import React, { useState, useMemo } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  Text,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";

interface CalendarPickerProps {
  visible: boolean;
  fromDate: string;
  toDate: string;
  onSelect: (from: string, to: string) => void;
  onClose: () => void;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function fmt(y: number, m: number, d: number): string {
  const pm = String(m + 1).padStart(2, "0");
  const pd = String(d).padStart(2, "0");
  return `${y}-${pm}-${pd}`;
}

function parseYMD(s: string): [number, number, number] {
  const [y, m, d] = s.split("-").map(Number);
  return [y!, m! - 1, d!];
}

export default function CalendarPicker({
  visible,
  fromDate,
  toDate,
  onSelect,
  onClose,
}: CalendarPickerProps) {
  const colors = useColors();
  const { t } = useLanguage();
  const today = new Date();
  const todayStr = fmt(today.getFullYear(), today.getMonth(), today.getDate());

  const [start, setStart] = useState(fromDate);
  const [end, setEnd] = useState(toDate);
  const [pickingEnd, setPickingEnd] = useState(false);
  const [viewYear, setViewYear] = useState(parseYMD(fromDate)[0]);
  const [viewMonth, setViewMonth] = useState(parseYMD(fromDate)[1]);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const [startY, startM, startD] = parseYMD(start);
  const [endY, endM, endD] = parseYMD(end);
  const startNum = startY * 10000 + startM * 100 + startD;
  const endNum = endY * 10000 + endM * 100 + endD;

  const cells: Array<{ day: number; date: string; isToday: boolean; inRange: boolean; isStart: boolean; isEnd: boolean }> = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = fmt(viewYear, viewMonth, d);
    const num = viewYear * 10000 + viewMonth * 100 + d;
    cells.push({
      day: d,
      date,
      isToday: date === todayStr,
      inRange: num >= startNum && num <= endNum,
      isStart: date === start,
      isEnd: date === end,
    });
  }

  const goMonth = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setViewYear(y);
    setViewMonth(m);
  };

  const tapDay = (date: string) => {
    if (!pickingEnd) {
      setStart(date);
      setEnd(date);
      setPickingEnd(true);
    } else {
      const [sy, sm, sd] = parseYMD(start);
      const [ey, em, ed] = parseYMD(date);
      const sNum = sy * 10000 + sm * 100 + sd;
      const eNum = ey * 10000 + em * 100 + ed;
      if (eNum < sNum) {
        setStart(date);
        setEnd(start);
      } else {
        setEnd(date);
      }
      setPickingEnd(false);
    }
  };

  const handleApply = () => {
    onSelect(start, end);
    onClose();
  };

  const isSelected = (date: string) => date === start || date === end;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={onClose} hitSlop={12}>
              <Feather name="x" size={22} color={colors.textSecondary} />
            </Pressable>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {pickingEnd ? "Select End Date" : "Select Start Date"}
            </Text>
            <View style={{ width: 22 }} />
          </View>

          {/* Month nav */}
          <View style={styles.monthNav}>
            <Pressable onPress={() => goMonth(-1)} hitSlop={8}>
              <Feather name="chevron-left" size={22} color={colors.primary} />
            </Pressable>
            <Text style={[styles.monthLabel, { color: colors.textPrimary }]}>
              {MONTHS[viewMonth]} {viewYear}
            </Text>
            <Pressable onPress={() => goMonth(1)} hitSlop={8}>
              <Feather name="chevron-right" size={22} color={colors.primary} />
            </Pressable>
          </View>

          {/* Weekday headers */}
          <View style={styles.weekRow}>
            {WEEKDAYS.map((w) => (
              <View key={w} style={styles.weekCell}>
                <Text style={[styles.weekLabel, { color: colors.textMuted }]}>{w}</Text>
              </View>
            ))}
          </View>

          {/* Day grid */}
          <View style={styles.grid}>
            {Array.from({ length: firstDay }).map((_, i) => (
              <View key={`empty-${i}`} style={styles.dayCell} />
            ))}
            {cells.map((c) => (
              <Pressable
                key={c.date}
                style={[
                  styles.dayCell,
                  c.inRange && { backgroundColor: colors.primary + "20" },
                  isSelected(c.date) && { backgroundColor: colors.primary, borderRadius: 20 },
                ]}
                onPress={() => tapDay(c.date)}
              >
                <Text
                  style={[
                    styles.dayText,
                    { color: colors.textPrimary },
                    c.isToday && { fontWeight: "800", color: colors.primary },
                    isSelected(c.date) && { color: "#fff", fontWeight: "800" },
                  ]}
                >
                  {c.day}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Selected range display */}
          <View style={[styles.rangeBox, { borderColor: colors.border }]}>
            <View style={styles.rangeItem}>
              <Text style={[styles.rangeLabel, { color: colors.textMuted }]}>From</Text>
              <Text style={[styles.rangeValue, { color: colors.textPrimary }]}>
                {new Date(start + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
              </Text>
            </View>
            <Feather name="arrow-right" size={16} color={colors.primary} />
            <View style={styles.rangeItem}>
              <Text style={[styles.rangeLabel, { color: colors.textMuted }]}>To</Text>
              <Text style={[styles.rangeValue, { color: colors.textPrimary }]}>
                {new Date(end + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
              </Text>
            </View>
          </View>

          {/* Quick selects */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickRow}>
            {[
              { label: "Today", from: todayStr, to: todayStr },
              { label: "Last 7 days", from: fmt(today.getFullYear(), today.getMonth(), today.getDate() - 7), to: todayStr },
              { label: "This month", from: fmt(today.getFullYear(), today.getMonth(), 1), to: todayStr },
              { label: "Last month", from: fmt(today.getFullYear(), today.getMonth() - 1, 1), to: fmt(today.getFullYear(), today.getMonth(), 0) },
            ].map((q) => (
              <Pressable
                key={q.label}
                style={[styles.quickBtn, { borderColor: colors.border }]}
                onPress={() => { setStart(q.from); setEnd(q.to); setPickingEnd(false); }}
              >
                <Text style={[styles.quickText, { color: colors.primary }]}>{q.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Apply */}
          <Pressable style={[styles.applyBtn, { backgroundColor: colors.primary }]} onPress={handleApply}>
            <Text style={styles.applyText}>Apply</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  card: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: "85%" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 16, fontWeight: "700" },
  monthNav: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  monthLabel: { fontSize: 18, fontWeight: "700" },
  weekRow: { flexDirection: "row", marginBottom: 4 },
  weekCell: { flex: 1, alignItems: "center", paddingVertical: 4 },
  weekLabel: { fontSize: 11, fontWeight: "600" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: { width: "14.28%", aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  dayText: { fontSize: 15, fontWeight: "500" },
  rangeBox: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, marginTop: 16, paddingTop: 16 },
  rangeItem: { alignItems: "center" },
  rangeLabel: { fontSize: 11, fontWeight: "600", marginBottom: 2 },
  rangeValue: { fontSize: 13, fontWeight: "600" },
  quickRow: { marginTop: 16, marginBottom: 8 },
  quickBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, marginRight: 8 },
  quickText: { fontSize: 12, fontWeight: "600" },
  applyBtn: { height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 12 },
  applyText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
