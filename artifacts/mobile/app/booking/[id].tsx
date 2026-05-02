import { Text, TextInput } from "@/components/Typography";
import { Feather } from "@expo/vector-icons";
import { useCancelBooking, useGetBooking } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useState } from "react";
import { ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  
  
  Linking,
  View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { formatEnglishDate } from "@/utils/tamilCalendar";

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const period = h! >= 12 ? "PM" : "AM";
  const hour = h! % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

function getStatusColor(status: string, bookingDate: string, colors: ReturnType<typeof useColors>): string {
  if (status === "cancelled") return colors.destructive;
  if (status === "completed") return colors.success;
  const today = new Date().toISOString().split("T")[0]!;
  if (bookingDate === today) return colors.primary;
  return colors.warning;
}

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const { data: booking, isLoading, refetch } = useGetBooking(
    id!,
    { query: { queryKey: ["booking", id] } }
  );

  const cancelMutation = useCancelBooking({
    mutation: {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowCancelModal(false);
        refetch();
      },
    },
  });

  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  if (isLoading || !booking) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const statusColor = getStatusColor(booking.status, booking.bookingDate, colors);
  const isFuture = booking.bookingDate >= new Date().toISOString().split("T")[0]!;
  const canCancel = booking.status === "confirmed" && isFuture;
  const canEdit = booking.status === "confirmed" && isFuture;

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const domain = process.env["EXPO_PUBLIC_DOMAIN"] || "localhost:3000";
      const isLocal = domain.includes("localhost") || domain.includes("192.168.") || domain.includes("10.0.");
      const baseUrl = `${isLocal ? "http" : "https"}://${domain}`;
      
      // Append token to bypass Authorization header requirement in external browser
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

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone) return;
    const venueName = booking.venues?.map((v) => v.venueName).join(", ") ?? "";
    const msg = `*Booking Confirmation - Bookal*
Booking Ref: ${booking.bookingRef}
Customer: ${booking.customerName}
Date: ${formatEnglishDate(booking.bookingDate)}${booking.tamilDateLabel ? ` (${booking.tamilDateLabel})` : ""}
Time: ${formatTime(booking.startTime)} - ${formatTime(booking.endTime)}
Venue: ${venueName}
Amount: ₹${Number(booking.totalAmount).toLocaleString("en-IN")}
Thank you for choosing us!`;
    Linking.openURL(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}`);
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleMarkPaid = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const domain = process.env["EXPO_PUBLIC_DOMAIN"] || "localhost:3000";
      const isLocal = domain.includes("localhost") || domain.includes("192.168.") || domain.includes("10.0.");
      const baseUrl = `${isLocal ? "http" : "https"}://${domain}`;
      
      const response = await fetch(`${baseUrl}/api/bookings/${booking.id}/pay`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      
      if (response.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        refetch();
      } else {
        throw new Error("Failed to mark as paid");
      }
    } catch (err) {
      Alert.alert("Error", "Could not mark booking as paid.");
    }
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
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Feather name="arrow-left" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {booking.bookingRef}
        </Text>
        <Pressable onPress={handleDownloadPdf} hitSlop={8}>
          <Feather name="share-2" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={[styles.refCard, { backgroundColor: colors.primary }]}>
          <Text style={styles.refText}>{booking.bookingRef}</Text>
          <View style={[styles.statusBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor === colors.primary ? "#fff" : statusColor }]} />
            <Text style={styles.statusText}>{booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}</Text>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SectionTitle title="Customer Details" icon="user" colors={colors} />
          <Text style={[styles.customerName, { color: colors.textPrimary }]}>{booking.customerName}</Text>
          {booking.phoneNumbers?.map((phone, idx) => (
            <View key={idx} style={styles.phoneActionRow}>
              <Pressable style={[styles.phoneRow, { flex: 1 }]} onPress={() => handleCall(phone)}>
                <Feather name="phone" size={14} color={colors.primary} />
                <Text style={[styles.phoneText, { color: colors.primary }]}>
                  +91 {phone.replace(/(\d{5})(\d{5})/, "$1 $2")}
                </Text>
              </Pressable>
              <Pressable 
                style={[styles.waCircle, { backgroundColor: "#25D36620" }]} 
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  Linking.openURL(`https://wa.me/91${phone.replace(/\D/g, "")}`);
                }}
              >
                <Feather name="message-circle" size={16} color="#25D366" />
              </Pressable>
            </View>
          ))}
          {booking.address ? (
            <DetailRow icon="map-pin" label="Address" value={booking.address} colors={colors} />
          ) : null}
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SectionTitle title="Booking Details" icon="calendar" colors={colors} />
          <DetailRow
            icon="calendar"
            label="Date"
            value={formatEnglishDate(booking.bookingDate)}
            colors={colors}
          />
          {booking.tamilDateLabel ? (
            <DetailRow icon="sun" label="Tamil Date" value={booking.tamilDateLabel} colors={colors} />
          ) : null}
          <DetailRow
            icon="clock"
            label="Time"
            value={`${formatTime(booking.startTime)} – ${formatTime(booking.endTime)}`}
            colors={colors}
          />
          <DetailRow
            icon="activity"
            label="Duration"
            value={`${booking.durationHours} hour${booking.durationHours !== 1 ? "s" : ""}`}
            colors={colors}
          />
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SectionTitle title="Venue & Pricing" icon="home" colors={colors} />
          {booking.venues?.map((v) => (
            <View key={v.id} style={styles.venueRow}>
              <Text style={[styles.venueLabel, { color: colors.textSecondary }]}>
                {v.venueName} ({booking.durationHours}h × ₹{v.pricePerHour.toLocaleString("en-IN")})
              </Text>
              <Text style={[styles.venueAmount, { color: colors.textPrimary }]}>₹{Number(v.subtotal).toLocaleString("en-IN")}</Text>
            </View>
          ))}
          <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.textPrimary }]}>TOTAL</Text>
            <Text style={[styles.totalAmount, { color: colors.primary }]}>₹{Number(booking.totalAmount).toLocaleString("en-IN")}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={[styles.paymentLabel, { color: colors.textSecondary }]}>Advance Paid</Text>
            <Text style={[styles.paymentValue, { color: colors.success }]}>- ₹{Number((booking as any).advanceAmount || 0).toLocaleString("en-IN")}</Text>
          </View>
          <View style={[styles.totalRow, { borderTopColor: colors.border, marginTop: 4, paddingTop: 12 }]}>
            <Text style={[styles.balanceLabel, { color: colors.textPrimary }]}>{(booking as any).isPaid ? "PAID" : "BALANCE"}</Text>
            <Text style={[styles.balanceAmount, { color: (booking as any).isPaid ? colors.success : colors.destructive }]}>
              ₹{(booking as any).isPaid ? "0" : (Number(booking.totalAmount) - Number((booking as any).advanceAmount || 0)).toLocaleString("en-IN")}
            </Text>
          </View>
        </View>

        {booking.notes ? (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SectionTitle title="Notes" icon="file-text" colors={colors} />
            <Text style={[styles.notes, { color: colors.textSecondary }]}>{booking.notes}</Text>
          </View>
        ) : null}

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SectionTitle title="Created By" icon="user-check" colors={colors} />
          <Text style={[styles.createdBy, { color: colors.textSecondary }]}>
            {booking.createdByName} • {new Date(booking.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </Text>
          {booking.cancelReason ? (
            <View style={[styles.cancelNote, { backgroundColor: colors.destructive + "15" }]}>
              <Feather name="alert-circle" size={13} color={colors.destructive} />
              <Text style={[styles.cancelNoteText, { color: colors.destructive }]}>
                Cancelled: {booking.cancelReason}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <Pressable 
          style={[styles.callBtn, { backgroundColor: colors.primary }]} 
          onPress={() => handleCall(booking.phoneNumbers?.[0] || "")}
        >
          <Feather name="phone" size={18} color="#fff" />
          <Text style={styles.callBtnText}>Call Customer</Text>
        </Pressable>
        <Pressable
          style={[styles.pdfBtn, { backgroundColor: colors.card, borderColor: colors.primary }]}
          onPress={handleDownloadPdf}
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
        {!(booking as any).isPaid && booking.status !== "cancelled" && (
          <Pressable
            style={[styles.payBtn, { backgroundColor: colors.success + "15", borderColor: colors.success }]}
            onPress={() => {
              Alert.alert("Mark as Paid", "Are you sure you want to mark this booking as fully paid?", [
                { text: "Cancel", style: "cancel" },
                { text: "Yes, Paid", onPress: handleMarkPaid }
              ]);
            }}
          >
            <Feather name="dollar-sign" size={18} color={colors.success} />
          </Pressable>
        )}
      </View>

      <Modal visible={showCancelModal} transparent animationType="fade" onRequestClose={() => setShowCancelModal(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowCancelModal(false)}>
          <Pressable
            style={[styles.cancelModal, { backgroundColor: colors.card }]}
            onPress={() => {}}
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
              numberOfLines={3}
            />
            <View style={styles.cancelModalBtns}>
              <Pressable
                style={[styles.cancelModalBtn, { backgroundColor: colors.secondary }]}
                onPress={() => setShowCancelModal(false)}
              >
                <Text style={[styles.cancelModalBtnText, { color: colors.textPrimary }]}>Keep Booking</Text>
              </Pressable>
              <Pressable
                style={[styles.cancelModalBtn, { backgroundColor: colors.destructive }]}
                onPress={() => {
                  if (!cancelReason.trim()) { Alert.alert("Required", "Please enter a reason"); return; }
                  cancelMutation.mutate({ id: id!, data: { reason: cancelReason } });
                }}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : (
                  <Text style={[styles.cancelModalBtnText, { color: "#fff" }]}>Confirm Cancel</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function SectionTitle({ title, icon, colors }: { title: string; icon: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Feather name={icon as "home"} size={13} color={colors.primary} />
      <Text style={[styles.sectionTitleText, { color: colors.primary }]}>{title}</Text>
    </View>
  );
}

function DetailRow({ icon, label, value, colors }: { icon: string; label: string; value: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.detailRow}>
      <Feather name={icon as "home"} size={13} color={colors.textMuted} />
      <Text style={[styles.detailLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontSize: 16, fontWeight: "700" as const, flex: 1, textAlign: "center" },
  scroll: { flex: 1 },
  refCard: { borderRadius: 16, padding: 20, marginBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  refText: { fontSize: 18, fontWeight: "800" as const, color: "#fff" },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { color: "#fff", fontSize: 12, fontWeight: "600" as const },
  section: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  sectionTitleText: { fontSize: 11, fontWeight: "700" as const, textTransform: "uppercase", letterSpacing: 0.8 },
  customerName: { fontSize: 20, fontWeight: "800" as const, marginBottom: 12 },
  phoneActionRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  phoneRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.02)" },
  phoneText: { fontSize: 15, fontWeight: "700" as const },
  waCircle: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  detailLabel: { fontSize: 13, width: 80 },
  detailValue: { fontSize: 13, flex: 1 },
  venueRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  venueLabel: { fontSize: 13, flex: 1 },
  venueAmount: { fontSize: 13, fontWeight: "600" as const },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
  totalLabel: { fontSize: 14, fontWeight: "700" as const },
  totalAmount: { fontSize: 20, fontWeight: "800" as const },
  notes: { fontSize: 14, lineHeight: 21 },
  createdBy: { fontSize: 13 },
  cancelNote: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, padding: 10, borderRadius: 10 },
  cancelNoteText: { fontSize: 12, flex: 1 },
  footer: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  callBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 50, borderRadius: 12 },
  callBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" as const },
  pdfBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 50, paddingHorizontal: 18, borderRadius: 12, borderWidth: 1.5 },
  pdfBtnText: { fontSize: 14, fontWeight: "700" as const },
  cancelBtn: { width: 50, height: 50, borderRadius: 12, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  payBtn: { width: 50, height: 50, borderRadius: 12, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  paymentRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  paymentLabel: { fontSize: 13, fontWeight: "500" as const },
  paymentValue: { fontSize: 14, fontWeight: "700" as const },
  balanceLabel: { fontSize: 15, fontWeight: "800" as const },
  balanceAmount: { fontSize: 18, fontWeight: "800" as const },
  cancelBtnText: { fontSize: 14, fontWeight: "700" as const },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  cancelModal: { margin: 16, borderRadius: 20, padding: 24 },
  cancelModalTitle: { fontSize: 18, fontWeight: "800" as const, marginBottom: 6 },
  cancelModalSubtitle: { fontSize: 13, marginBottom: 16 },
  cancelInput: { borderWidth: 1.5, borderRadius: 12, padding: 12, fontSize: 14, minHeight: 80, textAlignVertical: "top", marginBottom: 16 },
  cancelModalBtns: { flexDirection: "row", gap: 10 },
  cancelModalBtn: { flex: 1, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cancelModalBtnText: { fontSize: 14, fontWeight: "700" as const },
});
