import { Feather } from "@expo/vector-icons";
import { useGetBookings, useGetReportSummary } from "@workspace/api-client-react";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BookingCard from "@/components/BookingCard";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

function getDateRange(preset: string): { from: string; to: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = fmt(now);

  if (preset === "today") return { from: today, to: today };
  if (preset === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - 7);
    return { from: fmt(start), to: today };
  }
  if (preset === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: fmt(start), to: today };
  }
  return { from: today, to: today };
}

export default function ReportsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [preset, setPreset] = useState("month");
  const { from, to } = getDateRange(preset);

  const { data: summary, isLoading: summaryLoading } = useGetReportSummary(
    { from, to },
    { query: { queryKey: ["report-summary", from, to] } }
  );

  const { data: bookingsData, isLoading: bookingsLoading } = useGetBookings(
    { from, to, limit: 50 },
    { query: { queryKey: ["bookings-report", from, to] } }
  );

  if (user?.role !== "admin") {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <Feather name="lock" size={40} color={colors.border} />
        <Text style={[styles.noAccessTitle, { color: colors.textSecondary }]}>Admin Only</Text>
        <Text style={[styles.noAccessText, { color: colors.textMuted }]}>Reports are only accessible to admins</Text>
      </View>
    );
  }

  const PRESETS = [
    { key: "today", label: "Today" },
    { key: "week", label: "This Week" },
    { key: "month", label: "This Month" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Reports</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100, padding: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.presetRow}>
          {PRESETS.map((p) => (
            <Pressable
              key={p.key}
              style={[
                styles.presetBtn,
                {
                  backgroundColor: preset === p.key ? colors.primary : colors.card,
                  borderColor: preset === p.key ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setPreset(p.key)}
            >
              <Text
                style={[
                  styles.presetText,
                  { color: preset === p.key ? "#fff" : colors.textSecondary },
                ]}
              >
                {p.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.dateRange, { color: colors.textMuted }]}>
          {from} → {to}
        </Text>

        {summaryLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
        ) : summary ? (
          <>
            <View style={styles.statsGrid}>
              <StatCard label="Total Bookings" value={String(summary.totalBookings)} colors={colors} icon="calendar" />
              <StatCard
                label="Revenue"
                value={`₹${Number(summary.totalRevenue).toLocaleString("en-IN")}`}
                colors={colors}
                icon="trending-up"
                accent
              />
              <StatCard label="Confirmed" value={String(summary.confirmedBookings)} colors={colors} icon="check-circle" />
              <StatCard label="Cancelled" value={String(summary.cancelledBookings)} colors={colors} icon="x-circle" />
              <StatCard
                label="Avg Value"
                value={`₹${Math.round(summary.avgBookingValue).toLocaleString("en-IN")}`}
                colors={colors}
                icon="bar-chart-2"
              />
            </View>

            {summary.byVenue.length > 0 && (
              <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Venue Performance</Text>
                {summary.byVenue.map((v) => (
                  <View key={v.venueId} style={styles.venueRow}>
                    <Text style={[styles.venueName, { color: colors.textPrimary }]}>{v.venueName}</Text>
                    <View style={styles.venueStats}>
                      <Text style={[styles.venueCount, { color: colors.textSecondary }]}>{v.bookingCount} bookings</Text>
                      <Text style={[styles.venueRevenue, { color: colors.primary }]}>
                        ₹{Number(v.revenue).toLocaleString("en-IN")}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {summary.byEmployee.length > 0 && (
              <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>By Employee</Text>
                {summary.byEmployee.map((e) => (
                  <View key={e.userId} style={styles.venueRow}>
                    <Text style={[styles.venueName, { color: colors.textPrimary }]}>{e.userName}</Text>
                    <View style={styles.venueStats}>
                      <Text style={[styles.venueCount, { color: colors.textSecondary }]}>{e.bookingCount} bookings</Text>
                      <Text style={[styles.venueRevenue, { color: colors.primary }]}>
                        ₹{Number(e.revenue).toLocaleString("en-IN")}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : null}

        {bookingsLoading ? null : (
          <View style={styles.bookingListSection}>
            <Text style={[styles.sectionTitle2, { color: colors.textSecondary }]}>
              Bookings ({bookingsData?.bookings?.length ?? 0})
            </Text>
            {(bookingsData?.bookings ?? []).map((b) => (
              <BookingCard
                key={b.id}
                booking={b}
                onPress={() => router.push(`/booking/${b.id}`)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function StatCard({
  label,
  value,
  colors,
  icon,
  accent,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
  icon: string;
  accent?: boolean;
}) {
  return (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor: accent ? colors.primary : colors.card,
          borderColor: accent ? colors.primary : colors.border,
        },
      ]}
    >
      <Feather name={icon as "calendar"} size={18} color={accent ? "#fff" : colors.primary} />
      <Text style={[styles.statValue, { color: accent ? "#fff" : colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: accent ? "rgba(255,255,255,0.8)" : colors.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center", gap: 12 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 22, fontWeight: "800" as const },
  scroll: { flex: 1 },
  presetRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  presetBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
  },
  presetText: { fontSize: 12, fontWeight: "600" as const },
  dateRange: { fontSize: 11, marginBottom: 16, textAlign: "center" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  statCard: {
    width: "47%",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: { fontSize: 20, fontWeight: "800" as const },
  statLabel: { fontSize: 11, textAlign: "center" },
  section: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 14, fontWeight: "700" as const, marginBottom: 12 },
  sectionTitle2: { fontSize: 12, fontWeight: "700" as const, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 },
  venueRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  venueName: { fontSize: 14, flex: 1 },
  venueStats: { alignItems: "flex-end" },
  venueCount: { fontSize: 11 },
  venueRevenue: { fontSize: 13, fontWeight: "700" as const },
  bookingListSection: { marginTop: 8 },
  noAccessTitle: { fontSize: 18, fontWeight: "700" as const },
  noAccessText: { fontSize: 14, textAlign: "center" },
});
