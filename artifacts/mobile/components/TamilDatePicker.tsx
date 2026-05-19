import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { Text } from "@/components/Typography";
import {
  TAMIL_MONTHS,
  formatEnglishDate,
  getDaysInTamilMonth,
  getTamilYearOptions,
  toTamilNumeral,
} from "@/utils/tamilCalendar";

interface Colors {
  primary: string;
  card: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  secondary: string;
}

interface TamilDatePickerProps {
  month: string;
  day: number;
  year: number;
  gregorianDate: string;
  onChange: (month: string, day: number, year: number) => void;
  colors: Colors;
  labels: {
    month: string;
    day: string;
    year: string;
    englishEquivalent: string;
  };
}

export default function TamilDatePicker({
  month,
  day,
  year,
  gregorianDate,
  onChange,
  colors,
  labels,
}: TamilDatePickerProps) {
  const maxDays = useMemo(() => getDaysInTamilMonth(month, year), [month, year]);
  const yearOptions = useMemo(() => getTamilYearOptions(), []);
  const dayOptions = useMemo(
    () => Array.from({ length: maxDays }, (_, i) => i + 1),
    [maxDays]
  );

  const select = (m: string, d: number, y: number) => {
    Haptics.selectionAsync();
    const cappedDay = Math.min(Math.max(1, d), getDaysInTamilMonth(m, y));
    onChange(m, cappedDay, y);
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{labels.month}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.monthRow}
      >
        {TAMIL_MONTHS.map((m) => {
          const selected = month === m;
          return (
            <Pressable
              key={m}
              onPress={() => select(m, day, year)}
              style={[
                styles.monthChip,
                {
                  backgroundColor: selected ? colors.primary : colors.card,
                  borderColor: selected ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.monthChipText,
                  { color: selected ? "#fff" : colors.textPrimary },
                ]}
              >
                {m}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{labels.day}</Text>
          <View style={[styles.pickerBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ScrollView style={styles.dayScroll} showsVerticalScrollIndicator={false}>
              {dayOptions.map((d) => {
                const selected = day === d;
                return (
                  <Pressable
                    key={d}
                    onPress={() => select(month, d, year)}
                    style={[styles.dayItem, selected && { backgroundColor: colors.primary + "18" }]}
                  >
                    <Text
                      style={[
                        styles.dayNum,
                        { color: selected ? colors.primary : colors.textPrimary },
                      ]}
                    >
                      {d}
                    </Text>
                    <Text style={[styles.dayTamil, { color: colors.textMuted }]}>
                      {toTamilNumeral(d)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>

        <View style={styles.col}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{labels.year}</Text>
          <View style={[styles.pickerBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ScrollView style={styles.dayScroll} showsVerticalScrollIndicator={false}>
              {yearOptions.map((y) => {
                const selected = year === y;
                return (
                  <Pressable
                    key={y}
                    onPress={() => select(month, day, y)}
                    style={[styles.yearItem, selected && { backgroundColor: colors.primary + "18" }]}
                  >
                    <Text
                      style={[
                        styles.yearText,
                        { color: selected ? colors.primary : colors.textPrimary },
                      ]}
                    >
                      {y}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </View>

      <View style={[styles.summary, { backgroundColor: colors.secondary }]}>
        <Feather name="calendar" size={14} color={colors.primary} />
        <View style={styles.summaryText}>
          <Text style={[styles.summaryTamil, { color: colors.textPrimary }]}>
            {month} {day}, {year}
          </Text>
          <Text style={[styles.summaryEn, { color: colors.textSecondary }]}>
            {labels.englishEquivalent}: {formatEnglishDate(gregorianDate)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  sectionLabel: { fontSize: 12, fontWeight: "600", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  monthRow: { gap: 8, paddingVertical: 4 },
  monthChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  monthChipText: { fontSize: 14, fontWeight: "600" },
  row: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  pickerBox: {
    borderRadius: 12,
    borderWidth: 1,
    height: 180,
    overflow: "hidden",
  },
  dayScroll: { flex: 1 },
  dayItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dayNum: { fontSize: 16, fontWeight: "700" },
  dayTamil: { fontSize: 13 },
  yearItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  yearText: { fontSize: 17, fontWeight: "700" },
  summary: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 12,
  },
  summaryText: { flex: 1, gap: 2 },
  summaryTamil: { fontSize: 15, fontWeight: "700" },
  summaryEn: { fontSize: 13 },
});
