import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useGetBooking, useCancelBooking } from "@workspace/api-client-react";

// Helper to clean text for PDF
function cleanText(val: any): string {
  if (val === null || val === undefined) return "";
  return String(val).replace(/[^\x20-\x7E]/g, "").trim();
}

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const { data: booking, isLoading, refetch } = useGetBooking(id!);
  
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);

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

  const handleCancelBooking = () => {
    if (!cancelReason.trim()) {
      Alert.alert("Error", "Please provide a reason for cancellation");
      return;
    }
    cancelMutation.mutate({ id: id!, data: { reason: cancelReason } });
  };

  const handleDownloadReceipt = async () => {
    try {
      setDownloadingPdf(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const envDomain = process.env["EXPO_PUBLIC_DOMAIN"] || "bookal.onrender.com";
      let domain = envDomain;
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        domain = domain.replace('127.0.0.1', 'localhost');
      }
      
      const isLocal = domain.includes("localhost") || domain.includes("127.0.0.1") || domain.includes("192.168.");
      const baseUrl = `${isLocal ? "http" : "https"}://${domain}`;
      

      
      const pdfUrl = `${baseUrl}/api/bookings/${booking.id}/pdf?token=${token}`;
      
      await WebBrowser.openBrowserAsync(pdfUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        controlsColor: colors.primary,
        toolbarColor: colors.background,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error("PDF Download Error:", err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleMarkPaid = async () => {
    try {
      setMarkingPaid(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const envDomain = process.env["EXPO_PUBLIC_DOMAIN"] || "bookal.onrender.com";
      let domain = envDomain;
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        domain = domain.replace('127.0.0.1', 'localhost');
      }
      
      const isLocal = domain.includes("localhost") || domain.includes("127.0.0.1") || domain.includes("192.168.");
      const baseUrl = `${isLocal ? "http" : "https"}://${domain}`;
      

      
      const response = await fetch(`${baseUrl}/api/bookings/${booking.id}/pay`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      
      const result = await response.json();
      
      if (response.ok && (result.success || result.id)) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        refetch();
      } else {
        throw new Error(result.message || "Failed to mark as paid");
      }
    } catch (err: any) {
      console.error("[Payment] Error:", err);
      Alert.alert("Payment Error", err.message || "Could not connect to server.");
    } finally {
      setMarkingPaid(false);
    }
  };

  const handleCall = (phone: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone.replace(/\s/g, "")}`);
  };

  const formatEnglishDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr: string) => {
    try {
      const [h, m] = timeStr.split(":");
      const date = new Date();
      date.setHours(parseInt(h!), parseInt(m!), 0, 0);
      return new Intl.DateTimeFormat('en-IN', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      }).format(date);
    } catch {
      return timeStr;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable 
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(tabs)/reports");
            }
          }} 
          hitSlop={8}
        >
          <Feather name="arrow-left" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {booking.bookingRef}
        </Text>
        <Pressable hitSlop={8}>
          <Feather name="share-2" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, boxShadow: '0px 2px 8px rgba(0,0,0,0.05)' }]}>
          <View style={styles.sectionHeader}>
            <Feather name="user" size={16} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Customer Details</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Name</Text>
            <Text style={[styles.value, { color: colors.textPrimary }]}>{booking.customerName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Phone</Text>
            <View style={styles.phoneGroup}>
              {booking.phoneNumbers?.map((p, i) => (
                <Text key={i} style={[styles.value, { color: colors.textPrimary }]}>{p}{i < booking.phoneNumbers!.length - 1 ? ", " : ""}</Text>
              ))}
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Address</Text>
            <Text style={[styles.value, { color: colors.textPrimary }]}>{booking.address || "N/A"}</Text>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, boxShadow: '0px 2px 8px rgba(0,0,0,0.05)' }]}>
          <View style={styles.sectionHeader}>
            <Feather name="calendar" size={16} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Booking Details</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Date</Text>
            <Text style={[styles.value, { color: colors.textPrimary }]}>{formatEnglishDate(booking.bookingDate)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Tamil Date</Text>
            <Text style={[styles.value, { color: colors.textPrimary }]}>{booking.tamilDateLabel || "N/A"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Time</Text>
            <Text style={[styles.value, { color: colors.textPrimary }]}>{formatTime(booking.startTime)} - {formatTime(booking.endTime)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Duration</Text>
            <Text style={[styles.value, { color: colors.textPrimary }]}>{booking.durationHours} hours</Text>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, boxShadow: '0px 2px 8px rgba(0,0,0,0.05)' }]}>
          <View style={styles.sectionHeader}>
            <Feather name="home" size={16} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Venue & Pricing</Text>
          </View>
          {booking.venues?.map((v, i) => (
            <View key={i} style={styles.venueRow}>
              <Text style={[styles.venueName, { color: colors.textPrimary }]}>{v.venueName} ({booking.durationHours}h × ₹{Number(v.pricePerHour).toLocaleString()})</Text>
              <Text style={[styles.venuePrice, { color: colors.textPrimary }]}>₹{Number(v.subtotal).toLocaleString()}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.textPrimary }]}>TOTAL</Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>₹{Number(booking.totalAmount).toLocaleString("en-IN")}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={[styles.paymentLabel, { color: colors.textMuted }]}>Advance Paid</Text>
            <Text style={[styles.paymentValue, { color: colors.success }]}>- ₹{Number(booking.advanceAmount || 0).toLocaleString("en-IN")}</Text>
          </View>
          <View style={styles.balanceRow}>
            <Text style={[styles.balanceLabel, { color: colors.textPrimary }]}>BALANCE</Text>
            <Text style={[styles.balanceValue, { color: colors.destructive }]}>
              ₹{Number(booking.totalAmount - (booking.advanceAmount || 0)).toLocaleString("en-IN")}
            </Text>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, boxShadow: '0px 2px 8px rgba(0,0,0,0.05)' }]}>
          <View style={styles.sectionHeader}>
            <Feather name="user-check" size={16} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Created By</Text>
          </View>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{booking.createdByName} • {formatEnglishDate(booking.createdAt)}</Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 15, backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <Pressable 
          style={[styles.callBtn, { backgroundColor: colors.primary }]}
          onPress={() => handleCall(booking.phoneNumbers?.[0] || "")}
        >
          <Feather name="phone" size={18} color={WHITE} />
          <Text style={styles.callBtnText}>Call Customer</Text>
        </Pressable>
        <Pressable 
          style={[styles.pdfBtn, { backgroundColor: colors.primary + "15", borderColor: colors.primary }]}
          onPress={handleDownloadReceipt}
          disabled={downloadingPdf}
        >
          {downloadingPdf ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Feather name="download" size={18} color={colors.primary} />
          )}
          <Text style={[styles.pdfBtnText, { color: colors.primary }]}>PDF</Text>
        </Pressable>
        {canCancel && (
          <Pressable 
            style={[styles.cancelBtn, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive }]}
            onPress={() => setShowCancelModal(true)}
          >
            <Feather name="x-circle" size={18} color={colors.destructive} />
          </Pressable>
        )}
        {!booking.isPaid && booking.status !== "cancelled" && (
          <Pressable
            style={[styles.payBtn, { backgroundColor: colors.success + "15", borderColor: colors.success }]}
            onPress={() => {
              if (markingPaid) return;
              
              const title = "Mark as Paid";
              const message = "Are you sure you want to mark this booking as fully paid?";
              
              if (Platform.OS === 'web') {
                if (window.confirm(`${title}\n\n${message}`)) {
                  handleMarkPaid();
                }
              } else {
                Alert.alert(title, message, [
                  { text: "Cancel", style: "cancel" },
                  { text: "Yes, Paid", onPress: handleMarkPaid }
                ]);
              }
            }}
            disabled={markingPaid}
          >
            {markingPaid ? (
              <ActivityIndicator size="small" color={colors.success} />
            ) : (
              <Feather name="dollar-sign" size={18} color={colors.success} />
            )}
          </Pressable>
        )}
      </View>

      <Modal visible={showCancelModal} transparent animationType="fade" onRequestClose={() => setShowCancelModal(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowCancelModal(false)}>
          <View
            style={[styles.cancelModal, { backgroundColor: colors.card }]}
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <Text style={[styles.cancelModalTitle, { color: colors.textPrimary }]}>Cancel Booking</Text>
            <Text style={[styles.cancelModalSubtitle, { color: colors.textMuted }]}>
              Please provide a reason for cancellation
            </Text>
            <TextInput
              style={[styles.cancelInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="Reason for cancellation..."
              placeholderTextColor={colors.textMuted}
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
            />
            <View style={styles.modalActions}>
              <Pressable 
                style={[styles.modalBtn, { backgroundColor: colors.background }]} 
                onPress={() => setShowCancelModal(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.textPrimary }]}>Keep Booking</Text>
              </Pressable>
              <Pressable 
                style={[styles.modalBtn, { backgroundColor: colors.destructive }]} 
                onPress={handleCancelBooking}
              >
                <Text style={[styles.modalBtnText, { color: WHITE }]}>Cancel Now</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const WHITE = "#FFFFFF";

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", flex: 1, textAlign: "center" },
  scrollContent: { padding: 20 },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  sectionTitle: { fontSize: 14, fontWeight: "700", marginLeft: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  infoRow: { marginBottom: 12 },
  label: { fontSize: 12, marginBottom: 4 },
  value: { fontSize: 15, fontWeight: "600" },
  phoneGroup: { flexDirection: "row", flexWrap: "wrap" },
  venueRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  venueName: { fontSize: 14, flex: 1 },
  venuePrice: { fontSize: 14, fontWeight: "600" },
  divider: { height: 1, backgroundColor: "#E8DDD4", marginVertical: 12 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  totalLabel: { fontSize: 16, fontWeight: "800" },
  totalValue: { fontSize: 20, fontWeight: "900" },
  paymentLabel: { fontSize: 13 },
  paymentValue: { fontSize: 14, fontWeight: "600" },
  balanceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#E8DDD4" },
  balanceLabel: { fontSize: 15, fontWeight: "800" },
  balanceValue: { fontSize: 18, fontWeight: "900" },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    gap: 10,
  },
  callBtn: {
    flex: 2,
    height: 50,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  callBtnText: { color: WHITE, fontSize: 15, fontWeight: "700" },
  pdfBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  pdfBtnText: { fontSize: 14, fontWeight: "700" },
  cancelBtn: {
    width: 50,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  payBtn: {
    width: 50,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 20 },
  cancelModal: { borderRadius: 20, padding: 24 },
  cancelModalTitle: { fontSize: 20, fontWeight: "800", marginBottom: 8 },
  cancelModalSubtitle: { fontSize: 14, marginBottom: 20 },
  cancelInput: { borderRadius: 12, borderWidth: 1, padding: 12, height: 100, textAlignVertical: "top", fontSize: 15, marginBottom: 20 },
  modalActions: { flexDirection: "row", gap: 12 },
  modalBtn: { flex: 1, height: 50, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  modalBtnText: { fontSize: 15, fontWeight: "700" },
});
