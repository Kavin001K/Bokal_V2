import { Feather } from "@expo/vector-icons";
import { useGetBookings } from "@workspace/api-client-react";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import BookingCard from "@/components/BookingCard";
import { useColors } from "@/hooks/useColors";
import { gregorianToTamil, todayStr, tomorrowStr } from "@/utils/tamilCalendar";
import type { Booking } from "@workspace/api-client-react";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const today = todayStr();
  const tomorrow = tomorrowStr();
  const tamilToday = gregorianToTamil(today);

  const { data, refetch, isLoading } = useGetBookings(
    { limit: 50 },
    { query: { queryKey: ["bookings", "home"] } }
  );

  const bookings: Booking[] = data?.bookings ?? [];

  const filtered = search.trim()
    ? bookings.filter(
        (b) =>
          b.customerName.toLowerCase().includes(search.toLowerCase()) ||
          b.phoneNumbers?.some((p) => p.includes(search))
      )
    : bookings;

  const todayBookings = filtered.filter((b) => b.bookingDate === today);
  const tomorrowBookings = filtered.filter((b) => b.bookingDate === tomorrow);
  const upcomingBookings = filtered.filter(
    (b) =>
      b.bookingDate > tomorrow &&
      b.status === "confirmed"
  );
  const pastBookings = filtered.filter(
    (b) => b.bookingDate < today || b.status === "completed" || b.status === "cancelled"
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const totalToday = todayBookings.length;
  const mahalFree = !todayBookings.some((b) =>
    b.venues?.some((v) => v.venueType === "mahal") && b.status === "confirmed"
  );
  const roomsBooked = todayBookings.filter((b) => b.status === "confirmed").reduce((count, b) => {
    const roomCount = b.venues?.filter((v) => v.venueType === "room").length ?? 0;
    return count + roomCount;
  }, 0);
  const roomsFree = Math.max(0, 3 - roomsBooked);

  const renderSection = (title: string, items: Booking[], emptyMsg?: string) => {
    if (items.length === 0 && !emptyMsg) return null;
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
        {items.length === 0 ? (
          <Text style={[styles.emptyMsg, { color: colors.textMuted }]}>{emptyMsg}</Text>
        ) : (
          items.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              onPress={() => router.push(`/booking/${b.id}`)}
            />
          ))
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Bookal</Text>
          <Text style={[styles.headerDate, { color: colors.textMuted }]}>
            {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </Text>
        </View>
        <Pressable
          style={[styles.avatarBtn, { backgroundColor: colors.primary }]}
          onPress={() => setShowProfileMenu((v) => !v)}
        >
          <Text style={styles.avatarText}>
            {(user?.fullName ?? "U").charAt(0).toUpperCase()}
          </Text>
        </Pressable>
      </View>

      {showProfileMenu && (
        <View
          style={[
            styles.profileMenu,
            { backgroundColor: colors.card, borderColor: colors.border, top: insets.top + 60 },
          ]}
        >
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.textPrimary }]}>{user?.fullName}</Text>
            <Text style={[styles.profileEmail, { color: colors.textMuted }]}>{user?.email}</Text>
            <View style={[styles.roleBadge, { backgroundColor: colors.primary + "20" }]}>
              <Text style={[styles.roleText, { color: colors.primary }]}>{user?.role}</Text>
            </View>
          </View>
          <Pressable style={styles.menuItem} onPress={() => { setShowProfileMenu(false); router.push("/change-password"); }}>
            <Feather name="key" size={14} color={colors.textSecondary} />
            <Text style={[styles.menuItemText, { color: colors.textSecondary }]}>Change Password</Text>
          </Pressable>
          <Pressable
            style={[styles.menuItem, styles.logoutItem]}
            onPress={async () => { setShowProfileMenu(false); await logout(); router.replace("/login"); }}
          >
            <Feather name="log-out" size={14} color={colors.destructive} />
            <Text style={[styles.menuItemText, { color: colors.destructive }]}>Logout</Text>
          </Pressable>
        </View>
      )}

      {showProfileMenu && (
        <Pressable style={styles.menuOverlay} onPress={() => setShowProfileMenu(false)} />
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={[styles.greetingCard, { backgroundColor: colors.primary }]}>
          <Text style={styles.greeting}>
            {getGreeting()}, {user?.fullName?.split(" ")[0]} 👋
          </Text>
          <Text style={styles.greetingDate}>
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </Text>
          <Text style={styles.greetingTamil}>{tamilToday.display}</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsStrip}
        >
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{totalToday}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Today</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.statDot, { backgroundColor: mahalFree ? colors.success : colors.destructive }]} />
            <Text style={[styles.statValue, { color: mahalFree ? colors.success : colors.destructive }]}>
              {mahalFree ? "Free" : "Booked"}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Mahal</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{roomsFree}/3</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Rooms Free</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{bookings.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total</Text>
          </View>
        </ScrollView>

        <View style={styles.searchRow}>
          <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="search" size={16} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Search by name or phone..."
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")} hitSlop={8}>
                <Feather name="x" size={14} color={colors.textMuted} />
              </Pressable>
            )}
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.bookingsList}>
            {renderSection("Today", todayBookings)}
            {renderSection("Tomorrow", tomorrowBookings)}
            {renderSection("Upcoming", upcomingBookings)}
            {renderSection("Past", pastBookings)}
            {filtered.length === 0 && (
              <View style={styles.emptyState}>
                <Feather name="calendar" size={48} color={colors.border} />
                <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
                  No bookings found
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                  Create your first booking
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <Pressable
        style={[
          styles.fab,
          {
            backgroundColor: colors.primary,
            bottom: insets.bottom + 80,
          },
        ]}
        onPress={() => router.push("/(tabs)/new-booking")}
      >
        <Feather name="plus" size={24} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 22, fontWeight: "800" as const, letterSpacing: -0.5 },
  headerDate: { fontSize: 13 },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 14, fontWeight: "700" as const },
  profileMenu: {
    position: "absolute",
    right: 16,
    width: 220,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 100,
    overflow: "hidden",
  },
  menuOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
  },
  profileInfo: { padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E8DDD4" },
  profileName: { fontSize: 14, fontWeight: "700" as const },
  profileEmail: { fontSize: 12, marginTop: 2 },
  roleBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 6 },
  roleText: { fontSize: 11, fontWeight: "600" as const, textTransform: "capitalize" },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  logoutItem: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#E8DDD4" },
  menuItemText: { fontSize: 14 },
  scroll: { flex: 1 },
  greetingCard: {
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#C75B2A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  greeting: { fontSize: 18, fontWeight: "700" as const, color: "#fff" },
  greetingDate: { fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 4 },
  greetingTamil: { fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  statsStrip: { paddingHorizontal: 16, gap: 10, paddingBottom: 4 },
  statCard: {
    width: 90,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: "800" as const },
  statLabel: { fontSize: 10, marginTop: 2, textAlign: "center" },
  searchRow: { paddingHorizontal: 16, marginTop: 12, marginBottom: 4 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 14 },
  bookingsList: { paddingHorizontal: 16, paddingTop: 8 },
  section: { marginBottom: 8 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700" as const,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 8,
  },
  emptyMsg: { fontSize: 13, marginBottom: 8 },
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "600" as const },
  emptySubtitle: { fontSize: 13 },
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#C75B2A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
});
