import { AnimatedButton } from "@/components/AnimatedButton";
import { Text, TextInput } from "@/components/Typography";
import { Feather } from "@expo/vector-icons";
import { useGetBookings, useGetSettings, useGetVenues } from "@workspace/api-client-react";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useState, useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  Dimensions,
} from "react-native";
import Animated, { 
  FadeInDown, 
  FadeInRight, 
  Layout, 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence 
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import BookingCard from "@/components/BookingCard";
import { Skeleton } from "@/components/Skeleton";
import { useColors } from "@/hooks/useColors";
import { gregorianToTamil, todayStr, tomorrowStr } from "@/utils/tamilCalendar";
import type { Booking } from "@workspace/api-client-react";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

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
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const today = todayStr();
  const tomorrow = tomorrowStr();
  const tamilToday = gregorianToTamil(today);

  const { data: settings } = useGetSettings({ query: { queryKey: ["settings"] } });
  const bizName = settings?.biz_name || "Bookal";

  const { data, refetch, isLoading } = useGetBookings(
    { limit: 50 },
    { query: { queryKey: ["bookings", "home"] } }
  );

  const bookings: Booking[] = data?.bookings ?? [];
  const { data: venuesData } = useGetVenues();
  const activeVenues = (venuesData ?? []).filter((v) => v.isActive);

  const filtered = useMemo(() => (
    search.trim()
      ? bookings.filter(
          (b) =>
            b.customerName.toLowerCase().includes(search.toLowerCase()) ||
            b.phoneNumbers?.some((p) => p.includes(search))
        )
      : bookings
  ), [bookings, search]);

  const todayBookings = useMemo(() => filtered.filter((b) => b.bookingDate === today), [filtered, today]);
  const tomorrowBookings = useMemo(() => filtered.filter((b) => b.bookingDate === tomorrow), [filtered, tomorrow]);
  const upcomingBookings = useMemo(() => filtered.filter(
    (b) => b.bookingDate > tomorrow
  ).sort((a, b) => a.bookingDate.localeCompare(b.bookingDate)), [filtered, tomorrow]);

  const pastBookings = useMemo(() => filtered.filter(
    (b) => b.bookingDate < today
  ).sort((a, b) => b.bookingDate.localeCompare(a.bookingDate)), [filtered, today]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const totalToday = todayBookings.length;
  const confirmedToday = todayBookings.filter((b) => b.status === "confirmed");
  const totalHalls = activeVenues.filter((v) => v.type === "mahal").length;
  const totalRooms = activeVenues.filter((v) => v.type === "room").length;
  const hallsBooked = confirmedToday.reduce((count, b) => count + (b.venues?.filter((v) => v.venueType === "mahal").length ?? 0), 0);
  const roomsBooked = confirmedToday.reduce((count, b) => count + (b.venues?.filter((v) => v.venueType === "room").length ?? 0), 0);
  const hallsFree = Math.max(0, totalHalls - hallsBooked);

  const todayRevenue = todayBookings
    .filter(b => b.status === 'confirmed' || b.status === 'completed')
    .reduce((acc, b) => acc + Number(b.totalAmount), 0);

  // Pulse animation for the "Free" status
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(1.2, { duration: 1000 }), withTiming(1, { duration: 1000 })),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 0.8,
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Premium Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted, fontSize: 16, marginTop: 4 }]}>
            {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </Text>
        </View>
        <Pressable
          style={[styles.avatarBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowProfileMenu((v) => !v);
          }}
        >
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {(user?.fullName ?? "U").charAt(0).toUpperCase()}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Dynamic Hero Card */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.heroWrap}>
          <LinearGradient
            colors={[colors.primary, '#A64920']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroContent}>
              <View>
                <Text style={styles.greeting}>{getGreeting()}, {user?.fullName?.split(" ")[0]} 👋</Text>
                <Text style={styles.heroDate}>{tamilToday.display}</Text>
              </View>
              <Feather name="calendar" size={32} color="rgba(255,255,255,0.3)" />
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Quick Stats Strip (Horizontal) */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.statsStrip}
        >
          <Animated.View entering={FadeInRight.delay(200)} style={[styles.statPill, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '20' }]}>
            <Feather name="trending-up" size={14} color={colors.primary} />
            <Text style={[styles.pillValue, { color: colors.primary }]}>₹{todayRevenue.toLocaleString('en-IN')}</Text>
            <Text style={[styles.pillLabel, { color: colors.textMuted }]}>{t("revenue")}</Text>
          </Animated.View>

          <Animated.View entering={FadeInRight.delay(300)} style={[styles.statPill, { backgroundColor: hallsFree > 0 ? '#10B98110' : '#EF444410', borderColor: hallsFree > 0 ? '#10B98120' : '#EF444420' }]}>
            <View style={[styles.miniPulse, { backgroundColor: hallsFree > 0 ? '#10B981' : '#EF4444' }]} />
            <Text style={[styles.pillValue, { color: hallsFree > 0 ? '#10B981' : '#EF4444' }]}>{hallsBooked}/{totalHalls}</Text>
            <Text style={[styles.pillLabel, { color: colors.textMuted }]}>{t("halls")}</Text>
          </Animated.View>

          <Animated.View entering={FadeInRight.delay(400)} style={[styles.statPill, { backgroundColor: '#3B82F610', borderColor: '#3B82F620' }]}>
            <Feather name="home" size={14} color="#3B82F6" />
            <Text style={[styles.pillValue, { color: '#3B82F6' }]}>{roomsBooked}/{totalRooms} {t("booked")}</Text>
            <Text style={[styles.pillLabel, { color: colors.textMuted }]}>{t("rooms")}</Text>
          </Animated.View>

          <Animated.View entering={FadeInRight.delay(500)} style={[styles.statPill, { backgroundColor: colors.textMuted + '10', borderColor: colors.textMuted + '20' }]}>
            <Feather name="check-circle" size={14} color={colors.textSecondary} />
            <Text style={[styles.pillValue, { color: colors.textSecondary }]}>{totalToday} Total</Text>
            <Text style={[styles.pillLabel, { color: colors.textMuted }]}>{t("bookings")}</Text>
          </Animated.View>
        </ScrollView>
        {activeVenues.length === 0 ? (
          <View style={[styles.emptyFeed, { marginTop: 20 }]}>
            <Text style={[styles.emptyText, { color: colors.textSecondary, textAlign: "center" }]}>{t("noVenues")}</Text>
            <AnimatedButton
              onPress={() => router.push("/manage-venues")}
              style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.emptyBtnText}>{t("addVenue")}</Text>
            </AnimatedButton>
          </View>
        ) : null}

        {/* Smart Search */}
        <Animated.View entering={FadeInDown.delay(600).springify()} style={[styles.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search by name or phone..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={(t) => {
              if (t.length > search.length) Haptics.selectionAsync();
              setSearch(t);
            }}
          />
        </Animated.View>

        {/* Bookings Feed */}
        <View style={styles.feed}>
          {/* TODAY */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {search ? 'Search Results' : "Today's Schedule"}
            </Text>
            {todayBookings.length > 0 && (
              <Text style={[styles.countBadge, { backgroundColor: colors.primary + '15', color: colors.primary }]}>
                {todayBookings.length}
              </Text>
            )}
          </View>

          {isLoading ? (
            <View style={{ marginTop: 20, gap: 16 }}>
              {[1, 2, 3].map((i) => (
                <View key={i} style={{ flexDirection: "row", gap: 12, padding: 16, backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border }}>
                  <Skeleton width={50} height={50} borderRadius={25} />
                  <View style={{ flex: 1, gap: 8, justifyContent: "center" }}>
                    <Skeleton width="60%" height={16} />
                    <Skeleton width="40%" height={12} />
                  </View>
                  <View style={{ gap: 8, alignItems: "flex-end", justifyContent: "center" }}>
                    <Skeleton width={40} height={14} />
                    <Skeleton width={30} height={12} />
                  </View>
                </View>
              ))}
            </View>
          ) : todayBookings.length === 0 && !search && upcomingBookings.length === 0 && pastBookings.length === 0 ? (
            <Animated.View entering={FadeInDown} style={styles.emptyFeed}>
              <View style={[styles.emptyIconCircle, { backgroundColor: colors.border + '30' }]}>
                <Feather name="calendar" size={32} color={colors.textMuted} />
              </View>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No bookings found</Text>
              <AnimatedButton 
                onPress={() => router.push('/new-booking')}
                style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.emptyBtnText}>Create Booking</Text>
              </AnimatedButton>
            </Animated.View>
          ) : (
            todayBookings.map((b, idx) => (
              <Animated.View key={b.id} entering={FadeInDown.delay(100 * idx)}>
                <BookingCard
                  booking={b}
                  onPress={() => router.push(`/booking/${b.id}`)}
                />
              </Animated.View>
            ))
          )}

          {/* TOMORROW */}
          {tomorrowBookings.length > 0 && !search && (
            <>
              <View style={[styles.sectionHeader, { marginTop: 32 }]}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Tomorrow</Text>
                <Text style={[styles.countBadge, { backgroundColor: colors.secondary, color: colors.textSecondary }]}>
                  {tomorrowBookings.length}
                </Text>
              </View>
              {tomorrowBookings.map((b, idx) => (
                <Animated.View key={b.id} entering={FadeInDown.delay(50 * idx)}>
                  <BookingCard
                    booking={b}
                    onPress={() => router.push(`/booking/${b.id}`)}
                  />
                </Animated.View>
              ))}
            </>
          )}

          {/* UPCOMING */}
          {upcomingBookings.length > 0 && !search && (
            <>
              <View style={[styles.sectionHeader, { marginTop: 32 }]}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Upcoming Bookings</Text>
              </View>
              {upcomingBookings.map((b, idx) => (
                <Animated.View key={b.id} entering={FadeInDown.delay(50 * idx)}>
                  <BookingCard
                    booking={b}
                    onPress={() => router.push(`/booking/${b.id}`)}
                  />
                </Animated.View>
              ))}
            </>
          )}

          {/* PAST */}
          {pastBookings.length > 0 && !search && (
            <>
              <View style={[styles.sectionHeader, { marginTop: 40 }]}>
                <View style={styles.pastHeaderLine} />
                <Text style={[styles.sectionTitle, { color: colors.textMuted, fontSize: 14 }]}>Past History</Text>
                <View style={styles.pastHeaderLine} />
              </View>
              {pastBookings.slice(0, 20).map((b, idx) => (
                <Animated.View key={b.id} entering={FadeInDown.delay(30 * idx)} style={{ opacity: 0.8 }}>
                  <BookingCard
                    booking={b}
                    onPress={() => router.push(`/booking/${b.id}`)}
                  />
                </Animated.View>
              ))}
            </>
          )}
        </View>
      </ScrollView>

      {/* Profile Menu Overlay */}
      {showProfileMenu && (
        <View style={[styles.profileMenu, { backgroundColor: colors.card, borderColor: colors.border, top: insets.top + 60 }]}>
           <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.textPrimary }]}>{user?.fullName}</Text>
            <Text style={[styles.profileEmail, { color: colors.textMuted }]}>{user?.email}</Text>
          </View>
          <AnimatedButton style={styles.menuItem} onPress={() => { setShowProfileMenu(false); router.push("/edit-profile"); }}>
            <Feather name="user" size={16} color={colors.textSecondary} />
            <Text style={[styles.menuItemText, { color: colors.textSecondary }]}>My Profile</Text>
          </AnimatedButton>
          <AnimatedButton
            style={[styles.menuItem, styles.logoutItem]}
            onPress={async () => { setShowProfileMenu(false); await logout(); router.replace("/login"); }}
          >
            <Feather name="log-out" size={16} color={colors.destructive} />
            <Text style={[styles.menuItemText, { color: colors.destructive }]}>Logout</Text>
          </AnimatedButton>
        </View>
      )}
      {showProfileMenu && <Pressable style={styles.menuOverlay} onPress={() => setShowProfileMenu(false)} />}

      {/* Floating Action Button - Raised for visibility */}
      <Animated.View entering={FadeInDown.delay(800).springify()} style={[styles.fabWrap, { bottom: insets.bottom + 80 }]}>
        <AnimatedButton
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/new-booking');
          }}
        >
          <Feather name="plus" size={32} color="#fff" />
        </AnimatedButton>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  headerTitle: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, fontWeight: '600' },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  avatarText: { fontSize: 18, fontWeight: '800' },
  scroll: { flex: 1 },
  heroWrap: { paddingHorizontal: 20, marginTop: 10 },
  heroCard: {
    borderRadius: 28,
    padding: 24,
    boxShadow: '0px 10px 15px rgba(199, 91, 42, 0.3)',
    elevation: 8,
  },
  heroContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 4 },
  heroDate: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    height: 56,
    borderRadius: 18,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    gap: 12,
  },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '500' },
  statsStrip: { paddingHorizontal: 20, paddingTop: 10, gap: 12 },
  statPill: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 130,
  },
  pillValue: { fontSize: 15, fontWeight: '800' },
  pillLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  miniPulse: { width: 6, height: 6, borderRadius: 3 },
  feed: { paddingHorizontal: 20, marginTop: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  countBadge: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 12, fontSize: 12, fontWeight: '700' },
  emptyFeed: { alignItems: 'center', marginTop: 40 },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyText: { fontSize: 16, fontWeight: '600', marginBottom: 20 },
  emptyBtn: { paddingHorizontal: 24, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  emptyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  fabWrap: {
    position: 'absolute',
    right: 25,
    zIndex: 100,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 5px 10px rgba(0, 0, 0, 0.3)',
    elevation: 8,
  },
  profileMenu: {
    position: 'absolute',
    right: 20,
    width: 200,
    borderRadius: 20,
    borderWidth: 1,
    padding: 8,
    zIndex: 100,
  },
  profileInfo: { padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee', marginBottom: 4 },
  profileName: { fontSize: 15, fontWeight: '700' },
  profileEmail: { fontSize: 12 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12 },
  menuItemText: { fontSize: 14, fontWeight: '600' },
  logoutItem: { marginTop: 4 },
  menuOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 90, backgroundColor: 'transparent' },
  pastHeaderLine: { flex: 1, height: 1, backgroundColor: "#E5E7EB" },
});
