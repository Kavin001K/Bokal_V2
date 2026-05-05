import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { BlurView } from "expo-blur";
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useState, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { getApiBaseUrl } from "@/lib/apiBaseUrl";
import { Button } from "@/components/Button";
import { Text, TextInput } from "@/components/Typography";
import { useGetBooking, useCancelBooking } from "@workspace/api-client-react";

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const { data: booking, isLoading, refetch } = useGetBooking(id!);
  
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const cancelMutation = useCancelBooking({
    mutation: {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowCancelModal(false);
        refetch();
      },
    },
  });

  if (isLoading || !booking) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const isFuture = new Date(booking.bookingDate) >= new Date();
  const canCancel = booking.status === "confirmed" && isFuture;
  const isPaid = booking.isPaid;
  const isCancelled = booking.status === "cancelled";

  const handleCancelBooking = () => {
    if (!cancelReason.trim()) {
      Alert.alert("Error", t("requiredReason"));
      return;
    }
    cancelMutation.mutate({ id: id!, data: { reason: cancelReason } });
  };

  const handleDownloadReceipt = async () => {
    try {
      setDownloadingPdf(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const baseUrl = getApiBaseUrl();
      
      const pdfUrl = `${baseUrl}/api/bookings/${booking.id}/pdf?token=${token}`;
      
      await WebBrowser.openBrowserAsync(pdfUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      });
    } catch (err) {
      console.error("PDF Download Error:", err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleMarkPaid = async () => {
    try {
      setMarkingPaid(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const baseUrl = getApiBaseUrl();
      
      const response = await fetch(`${baseUrl}/api/bookings/${booking.id}/pay`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      
      const result = await response.json();
      if (response.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        refetch();
      } else {
        throw new Error(result.message || "Failed to mark as paid");
      }
    } catch (err: any) {
      Alert.alert("Payment Error", err.message || "Could not connect to server.");
    } finally {
      setMarkingPaid(false);
    }
  };

  const formatEnglishDate = (dateStr: string) => {
    try {
      return new Intl.DateTimeFormat('en-IN', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
      }).format(new Date(dateStr));
    } catch { return dateStr; }
  };

  const formatTime = (timeStr: string) => {
    try {
      const [h, m] = timeStr.split(":");
      const date = new Date();
      date.setHours(parseInt(h!), parseInt(m!), 0, 0);
      return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: 'numeric', hour12: true }).format(date);
    } catch { return timeStr; }
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View style={[styles.header, { paddingTop: insets.top, opacity: headerOpacity, zIndex: 10 }]}>
        <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="light" />
        <View style={styles.headerInner}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <Feather name="arrow-left" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>{booking.bookingRef}</Text>
          <View style={{ width: 40 }} />
        </View>
      </Animated.View>

      <Animated.ScrollView 
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 120 }]}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <LinearGradient
          colors={isCancelled ? ["#FEE2E2", "#FECACA"] : isPaid ? ["#ECFDF5", "#D1FAE5"] : ["#FFF7ED", "#FFEDD5"]}
          style={styles.heroCard}
        >
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroRef}>{booking.bookingRef}</Text>
              <Text style={styles.heroDate}>{formatEnglishDate(booking.bookingDate)}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: isCancelled ? "#EF4444" : isPaid ? "#10B981" : "#F59E0B" }]}>
              <Text style={styles.statusText}>{isCancelled ? t("cancelled") : isPaid ? t("paid") : t("pending")}</Text>
            </View>
          </View>
          
          <View style={styles.heroAmount}>
            <Text style={styles.amountLabel}>{t("totalAmount")}</Text>
            <Text style={styles.amountValue}>₹{Number(booking.totalAmount).toLocaleString("en-IN")}</Text>
          </View>
        </LinearGradient>

        <View style={styles.actionRow}>
          <Pressable onPress={handleDownloadReceipt} style={[styles.quickAction, { backgroundColor: colors.card }]}>
            <View style={[styles.actionIcon, { backgroundColor: "#EFF6FF" }]}>
              <Feather name="download" size={20} color="#3B82F6" />
            </View>
            <Text style={styles.actionLabel}>{t("receipt")}</Text>
          </Pressable>
          <Pressable style={[styles.quickAction, { backgroundColor: colors.card }]}>
            <View style={[styles.actionIcon, { backgroundColor: "#F5F3FF" }]}>
              <Feather name="share-2" size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.actionLabel}>{t("share")}</Text>
          </Pressable>
          <Pressable onPress={() => Linking.openURL(`tel:${booking.phoneNumbers?.[0]}`)} style={[styles.quickAction, { backgroundColor: colors.card }]}>
            <View style={[styles.actionIcon, { backgroundColor: "#ECFDF5" }]}>
              <Feather name="phone" size={20} color="#10B981" />
            </View>
            <Text style={styles.actionLabel}>{t("call")}</Text>
          </Pressable>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={styles.sectionTitle}>{t("customerInformation")}</Text>
          <View style={styles.detailItem}>
            <Feather name="user" size={16} color="#A89080" />
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>Client Name</Text>
              <Text style={styles.detailValue}>{booking.customerName}</Text>
            </View>
          </View>
          <View style={styles.detailItem}>
            <Feather name="phone" size={16} color="#A89080" />
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>Contact Numbers</Text>
              <Text style={styles.detailValue}>{booking.phoneNumbers?.join(", ")}</Text>
            </View>
          </View>
          <View style={styles.detailItem}>
            <Feather name="map-pin" size={16} color="#A89080" />
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>Address</Text>
              <Text style={styles.detailValue}>{booking.address || "No address provided"}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={styles.sectionTitle}>{t("eventSchedule")}</Text>
          <View style={styles.detailItem}>
            <Feather name="clock" size={16} color="#A89080" />
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>Timing</Text>
              <Text style={styles.detailValue}>{formatTime(booking.startTime)} – {formatTime(booking.endTime)}</Text>
              <Text style={styles.detailSub}>{booking.durationHours} Hours Duration</Text>
            </View>
          </View>
          <View style={styles.detailItem}>
            <Feather name="home" size={16} color="#A89080" />
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>Selected Venues</Text>
              {booking.venues?.map((v, i) => (
                <Text key={i} style={styles.detailValue}>• {v.venueName}</Text>
              ))}
            </View>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={styles.sectionTitle}>{t("paymentSummary")}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{t("totalFees")}</Text>
            <Text style={styles.priceValue}>₹{Number(booking.totalAmount).toLocaleString()}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{t("advancePaid")}</Text>
            <Text style={[styles.priceValue, { color: "#10B981" }]}>- ₹{Number(booking.advanceAmount).toLocaleString()}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.priceRow}>
            <Text style={styles.balanceLabel}>{t("balanceDue")}</Text>
            <Text style={[styles.balanceValue, { color: isPaid ? "#10B981" : "#EF4444" }]}>
              ₹{Number(booking.totalAmount - (booking.advanceAmount || 0)).toLocaleString()}
            </Text>
          </View>
        </View>
      </Animated.ScrollView>

      <BlurView intensity={90} tint="light" style={[styles.bottomActions, { paddingBottom: insets.bottom + 20 }]}>
        {!isPaid && !isCancelled && (
          <Button
            style={styles.mainBtn}
            variant="primary"
            label={t("markFullyPaid")}
            icon="check-circle"
            onPress={handleMarkPaid}
            loading={markingPaid}
          />
        )}
        {canCancel && (
          <Button
            style={[styles.mainBtn, { backgroundColor: "#FEE2E2", marginTop: 10 }]}
            variant="ghost"
            label={t("cancelBooking")}
            icon="x-circle"
            onPress={() => setShowCancelModal(true)}
          />
        )}
      </BlurView>
      <Modal visible={showCancelModal} transparent animationType="fade">
         <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20}}>
            <View style={{backgroundColor: 'white', padding: 20, borderRadius: 20}}>
               <Text style={{fontSize: 18, fontWeight: "700", color: colors.textPrimary}}>{t("cancelBooking")}</Text>
               <TextInput
                 style={{height: 100, borderWidth: 1, borderColor: "#ddd", borderRadius: 10, marginVertical: 15, padding: 10, color: colors.textPrimary, textAlignVertical: "top"}}
                 value={cancelReason}
                 onChangeText={setCancelReason}
                 placeholder={t("cancellationReason")}
                 multiline
               />
               <Button label={t("submit")} onPress={handleCancelBooking} />
            </View>
         </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { position: "absolute", top: 0, left: 0, right: 0, height: 100, justifyContent: "flex-end" },
  headerInner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, height: 60 },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  scrollContent: { paddingHorizontal: 20 },
  heroCard: { borderRadius: 24, padding: 24, marginBottom: 20 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  heroRef: { fontSize: 22, fontWeight: "900", letterSpacing: -0.5, color: "#1A1209" },
  heroDate: { fontSize: 14, color: "#6B5744", marginTop: 2 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: "900", color: "#FFF" },
  heroAmount: { borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.05)", paddingTop: 15 },
  amountLabel: { fontSize: 12, color: "#6B5744", textTransform: "uppercase", fontWeight: "700" },
  amountValue: { fontSize: 32, fontWeight: "900", color: "#1A1209", marginTop: 2 },
  actionRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  quickAction: { flex: 1, borderRadius: 16, padding: 12, alignItems: "center", elevation: 2 },
  actionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  actionLabel: { fontSize: 12, fontWeight: "700", color: "#6B5744" },
  section: { borderRadius: 20, padding: 20, marginBottom: 20, elevation: 1 },
  sectionTitle: { fontSize: 13, fontWeight: "800", color: "#A89080", textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 },
  detailItem: { flexDirection: "row", gap: 15, marginBottom: 16 },
  detailText: { flex: 1 },
  detailLabel: { fontSize: 11, color: "#A89080", fontWeight: "600", marginBottom: 2 },
  detailValue: { fontSize: 15, fontWeight: "600", color: "#1A1209" },
  detailSub: { fontSize: 12, color: "#6B5744", marginTop: 2 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  priceLabel: { fontSize: 14, color: "#6B5744" },
  priceValue: { fontSize: 14, fontWeight: "700" },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginVertical: 10 },
  balanceLabel: { fontSize: 16, fontWeight: "800", color: "#1A1209" },
  balanceValue: { fontSize: 20, fontWeight: "900" },
  bottomActions: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 15, borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  mainBtn: { height: 56, borderRadius: 16 },
});
