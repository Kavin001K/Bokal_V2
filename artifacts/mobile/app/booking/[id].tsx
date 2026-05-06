import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { BlurView } from "expo-blur";
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useState, useRef, useEffect } from "react";
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

  // Cancel state
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);

  // Advance payment state
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [recordingAdvance, setRecordingAdvance] = useState(false);

  // Amenity bill state
  const [showAmenityModal, setShowAmenityModal] = useState(false);
  const [amenityItems, setAmenityItems] = useState<{ name: string; amount: string }[]>([]);
  const [amenityNotes, setAmenityNotes] = useState("");
  const [creatingAmenity, setCreatingAmenity] = useState(false);
  const [amenityBills, setAmenityBills] = useState<any[]>([]);
  const [loadingAmenities, setLoadingAmenities] = useState(false);

  // Other state
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;

  const onRefresh = useCallback(() => {
    refetch();
    fetchAmenityBills();
  }, [refetch]);

  const cancelMutation = useCancelBooking({
    mutation: {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowCancelModal(false);
        setShowHeaderMenu(false);
        refetch();
      },
    },
  });

  // Fetch amenity bills for this booking
  const fetchAmenityBills = useCallback(async () => {
    try {
      setLoadingAmenities(true);
      const res = await fetch(`${getApiBaseUrl()}/api/bookings/${id}/amenity-bills`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAmenityBills(Array.isArray(data) ? data : []);
      }
    } catch {
      // silent
    } finally {
      setLoadingAmenities(false);
    }
  }, [id, token]);

  useEffect(() => {
    if (id) fetchAmenityBills();
  }, [id]);

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
      Alert.alert(t("errorTitle"), t("requiredReason"));
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

  const handleDownloadAmenityPdf = async (billId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const baseUrl = getApiBaseUrl();
      const pdfUrl = `${baseUrl}/api/amenity-bills/${billId}/pdf?token=${token}`;
      await WebBrowser.openBrowserAsync(pdfUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      });
    } catch (err) {
      console.error("Amenity PDF Download Error:", err);
    }
  };

  const handleRecordAdvance = async () => {
    const amt = parseFloat(advanceAmount);
    if (!amt || amt <= 0) {
      Alert.alert(t("errorTitle"), t("enterValidAmount"));
      return;
    }
    try {
      setRecordingAdvance(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await fetch(`${getApiBaseUrl()}/api/bookings/${booking.id}/advance`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt }),
      });
      const result = await res.json();
      if (res.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowAdvanceModal(false);
        setAdvanceAmount("");
        refetch();
      } else {
        throw new Error(result.message || "Failed");
      }
    } catch (err: any) {
      Alert.alert(t("errorTitle"), err.message || t("couldNotConnectServer"));
    } finally {
      setRecordingAdvance(false);
    }
  };

  const handleCreateAmenityBill = async () => {
    const validItems = amenityItems.filter((i) => i.name.trim() && parseFloat(i.amount) > 0);
    if (!validItems.length) {
      Alert.alert(t("errorTitle"), t("addAtLeastOneItem"));
      return;
    }
    try {
      setCreatingAmenity(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await fetch(`${getApiBaseUrl()}/api/bookings/${booking.id}/amenity-bills`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          items: validItems.map((i) => ({ name: i.name.trim(), amount: parseFloat(i.amount) })),
          notes: amenityNotes.trim() || undefined,
        }),
      });
      if (res.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowAmenityModal(false);
        setAmenityItems([]);
        setAmenityNotes("");
        fetchAmenityBills();
      } else {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to create amenity bill");
      }
    } catch (err: any) {
      Alert.alert(t("errorTitle"), err.message || t("couldNotConnectServer"));
    } finally {
      setCreatingAmenity(false);
    }
  };

  const addAmenityItem = () => {
    setAmenityItems([...amenityItems, { name: "", amount: "" }]);
  };

  const removeAmenityItem = (idx: number) => {
    setAmenityItems(amenityItems.filter((_, i) => i !== idx));
  };

  const updateAmenityItem = (idx: number, field: "name" | "amount", value: string) => {
    const updated = [...amenityItems];
    updated[idx] = { ...updated[idx], [field]: value };
    setAmenityItems(updated);
  };

  const amenityTotal = amenityItems.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);

  const handleMarkPaid = async () => {
    try {
      setMarkingPaid(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/bookings/${booking.id}/pay`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const result = await response.json();
      if (response.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        refetch();
      } else {
        throw new Error(result.message || "Failed to mark as paid");
      }
    } catch (err: any) {
      Alert.alert(t("paymentError"), err.message || t("couldNotConnectServer"));
    } finally {
      setMarkingPaid(false);
    }
  };

  const formatEnglishDate = (dateStr: string) => {
    try {
      return new Intl.DateTimeFormat("en-IN", {
        weekday: "short", day: "numeric", month: "short", year: "numeric",
      }).format(new Date(dateStr));
    } catch { return dateStr; }
  };

  const formatTime = (timeStr: string) => {
    try {
      const [h, m] = timeStr.split(":");
      const date = new Date();
      date.setHours(parseInt(h!), parseInt(m!), 0, 0);
      return new Intl.DateTimeFormat("en-IN", {
        hour: "numeric", minute: "numeric", hour12: true,
      }).format(date);
    } catch { return timeStr; }
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const balanceDue = Number(booking.totalAmount) - Number(booking.advanceAmount || 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Floating Header */}
      <Animated.View style={[styles.header, { paddingTop: insets.top, opacity: headerOpacity, zIndex: 10 }]}>
        <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="light" />
        <View style={styles.headerInner}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <Feather name="arrow-left" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>{booking.bookingRef}</Text>
          <Pressable
            style={styles.iconBtn}
            onPress={() => { Haptics.selectionAsync(); setShowHeaderMenu((v) => !v); }}
          >
            <Feather name="more-vertical" size={22} color={colors.textPrimary} />
          </Pressable>
        </View>
      </Animated.View>

      {/* Header Dropdown Menu */}
      {showHeaderMenu && (
        <>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowHeaderMenu(false)}>
            <View style={{ flex: 1 }} />
          </Pressable>
          <View style={[styles.headerDropdown, { top: insets.top + 55, right: 16, backgroundColor: colors.card, borderColor: colors.border }]}>
            {canCancel && (
              <Pressable
                style={styles.dropdownItem}
                onPress={() => { setShowHeaderMenu(false); setShowCancelModal(true); }}
              >
                <Feather name="x-circle" size={16} color={colors.destructive} />
                <Text style={[styles.dropdownText, { color: colors.destructive }]}>{t("cancelBooking")}</Text>
              </Pressable>
            )}
            {!canCancel && (
              <View style={styles.dropdownItem}>
                <Feather name="info" size={16} color={colors.textMuted} />
                <Text style={[styles.dropdownText, { color: colors.textMuted }]}>
                  {isCancelled ? t("cancelled") : t("cannotCancel")}
                </Text>
              </View>
            )}
          </View>
        </>
      )}

      <Animated.ScrollView
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 130 }]}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Hero Card */}
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

        {/* Quick Actions */}
        <View style={styles.actionRow}>
          <Pressable onPress={handleDownloadReceipt} style={[styles.quickAction, { backgroundColor: colors.card }]}>
            <View style={[styles.actionIcon, { backgroundColor: "#EFF6FF" }]}>
              <Feather name="download" size={20} color="#3B82F6" />
            </View>
            <Text style={styles.actionLabel}>{t("receipt")}</Text>
          </Pressable>
          <Pressable
            onPress={() => { setAmenityItems([{ name: "", amount: "" }]); setAmenityNotes(""); setShowAmenityModal(true); }}
            style={[styles.quickAction, { backgroundColor: colors.card }]}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#FEF3C7" }]}>
              <Feather name="file-plus" size={20} color="#F59E0B" />
            </View>
            <Text style={styles.actionLabel}>{t("amenitiesBill")}</Text>
          </Pressable>
          <Pressable onPress={() => Linking.openURL(`tel:${booking.phoneNumbers?.[0]}`)} style={[styles.quickAction, { backgroundColor: colors.card }]}>
            <View style={[styles.actionIcon, { backgroundColor: "#ECFDF5" }]}>
              <Feather name="phone" size={20} color="#10B981" />
            </View>
            <Text style={styles.actionLabel}>{t("call")}</Text>
          </Pressable>
        </View>

        {/* Customer Information */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={styles.sectionTitle}>{t("customerInformation")}</Text>
          <View style={styles.detailItem}>
            <Feather name="user" size={16} color="#A89080" />
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>{t("clientName")}</Text>
              <Text style={styles.detailValue}>{booking.customerName}</Text>
            </View>
          </View>
          <View style={styles.detailItem}>
            <Feather name="phone" size={16} color="#A89080" />
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>{t("contactNumbers")}</Text>
              <Text style={styles.detailValue}>{booking.phoneNumbers?.join(", ")}</Text>
            </View>
          </View>
          <View style={styles.detailItem}>
            <Feather name="map-pin" size={16} color="#A89080" />
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>{t("address")}</Text>
              <Text style={styles.detailValue}>{booking.address || t("noAddressProvided")}</Text>
            </View>
          </View>
        </View>

        {/* Event Schedule */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={styles.sectionTitle}>{t("eventSchedule")}</Text>
          <View style={styles.detailItem}>
            <Feather name="clock" size={16} color="#A89080" />
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>{t("timing")}</Text>
              <Text style={styles.detailValue}>{formatTime(booking.startTime)} – {formatTime(booking.endTime)}</Text>
              <Text style={styles.detailSub}>{booking.durationHours} {t("hoursDuration")}</Text>
            </View>
          </View>
          <View style={styles.detailItem}>
            <Feather name="home" size={16} color="#A89080" />
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>{t("selectedVenues")}</Text>
              {booking.venues?.map((v, i) => (
                <Text key={i} style={styles.detailValue}>• {v.venueName}</Text>
              ))}
            </View>
          </View>
        </View>

        {/* Payment Summary */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={styles.sectionTitle}>{t("paymentSummary")}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{t("totalFees")}</Text>
            <Text style={styles.priceValue}>₹{Number(booking.totalAmount).toLocaleString()}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{t("advancePaid")}</Text>
            <Text style={[styles.priceValue, { color: "#10B981" }]}>- ₹{Number(booking.advanceAmount || 0).toLocaleString()}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.priceRow}>
            <Text style={styles.balanceLabel}>{t("balanceDue")}</Text>
            <Text style={[styles.balanceValue, { color: isPaid ? "#10B981" : "#EF4444" }]}>
              ₹{balanceDue.toLocaleString()}
            </Text>
          </View>
          {/* Record Advance Button */}
          {!isPaid && !isCancelled && (
            <Pressable
              style={[styles.advanceBtn, { borderColor: colors.primary }]}
              onPress={() => { setAdvanceAmount(""); setShowAdvanceModal(true); }}
            >
              <Feather name="plus-circle" size={16} color={colors.primary} />
              <Text style={[styles.advanceBtnText, { color: colors.primary }]}>{t("recordAdvance")}</Text>
            </Pressable>
          )}
        </View>

        {/* Amenities Bills */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{t("amenitiesBills")}</Text>
            {!isCancelled && (
              <Pressable
                style={[styles.smallAddBtn, { backgroundColor: colors.primary + "15" }]}
                onPress={() => { setAmenityItems([{ name: "", amount: "" }]); setAmenityNotes(""); setShowAmenityModal(true); }}
              >
                <Feather name="plus" size={14} color={colors.primary} />
                <Text style={[styles.smallAddText, { color: colors.primary }]}>{t("newBill")}</Text>
              </Pressable>
            )}
          </View>

          {loadingAmenities ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
          ) : amenityBills.length === 0 ? (
            <Text style={[styles.emptyHint, { color: colors.textMuted }]}>{t("noAmenityBills")}</Text>
          ) : (
            amenityBills.map((bill: any) => (
              <View key={bill.id} style={[styles.billCard, { borderColor: colors.border }]}>
                <View style={styles.billInfo}>
                  <Text style={[styles.billTitle, { color: colors.textPrimary }]}>
                    Bill #{bill.id.slice(0, 8).toUpperCase()}
                  </Text>
                  <Text style={[styles.billMeta, { color: colors.textMuted }]}>
                    {(bill.items as any[])?.length || 0} items • {new Date(bill.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.billRight}>
                  <Text style={[styles.billAmount, { color: colors.primary }]}>
                    ₹{Number(bill.totalAmount).toLocaleString("en-IN")}
                  </Text>
                  <Pressable
                    style={[styles.downloadPill, { backgroundColor: colors.primary + "10" }]}
                    onPress={() => handleDownloadAmenityPdf(bill.id)}
                  >
                    <Feather name="download" size={12} color={colors.primary} />
                    <Text style={[styles.downloadPillText, { color: colors.primary }]}>PDF</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>
      </Animated.ScrollView>

      {/* Bottom Bar — only "Mark as Fully Paid" */}
      {!isPaid && !isCancelled && (
        <BlurView intensity={90} tint="light" style={[styles.bottomActions, { paddingBottom: insets.bottom + 20 }]}>
          <Button
            style={styles.mainBtn}
            variant="primary"
            label={t("markFullyPaid")}
            icon="check-circle"
            onPress={handleMarkPaid}
            loading={markingPaid}
          />
        </BlurView>
      )}

      {/* Cancel Modal */}
      <Modal visible={showCancelModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t("cancelBooking")}</Text>
            <TextInput
              style={[styles.modalInput, { borderColor: colors.border, color: colors.textPrimary }]}
              value={cancelReason}
              onChangeText={setCancelReason}
              placeholder={t("cancellationReason")}
              placeholderTextColor={colors.textMuted}
              multiline
            />
            <View style={styles.modalBtnRow}>
              <Pressable style={[styles.modalCancelBtn, { borderColor: colors.border }]} onPress={() => setShowCancelModal(false)}>
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>{t("cancel")}</Text>
              </Pressable>
              <Pressable style={[styles.modalConfirmBtn, { backgroundColor: colors.destructive }]} onPress={handleCancelBooking}>
                <Text style={styles.modalConfirmText}>{t("submit")}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Advance Payment Modal */}
      <Modal visible={showAdvanceModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t("recordAdvancePayment")}</Text>
            <Text style={[styles.modalSub, { color: colors.textMuted }]}>
              Balance Due: ₹{balanceDue.toLocaleString()}
            </Text>
            <TextInput
              style={[styles.modalInput, { borderColor: colors.border, color: colors.textPrimary, fontSize: 24, fontWeight: "700", textAlign: "center" }]}
              value={advanceAmount}
              onChangeText={(v) => setAdvanceAmount(v.replace(/[^0-9.]/g, ""))}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />
            <View style={styles.modalBtnRow}>
              <Pressable style={[styles.modalCancelBtn, { borderColor: colors.border }]} onPress={() => setShowAdvanceModal(false)}>
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>{t("cancel")}</Text>
              </Pressable>
              <Pressable
                style={[styles.modalConfirmBtn, { backgroundColor: colors.primary }]}
                onPress={handleRecordAdvance}
                disabled={recordingAdvance}
              >
                {recordingAdvance ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmText}>{t("record")}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Amenity Bill Modal */}
      <Modal visible={showAmenityModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.amenityModal, { backgroundColor: colors.card }]}>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: "80%" }}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t("amenitiesBills")}</Text>
              <Text style={[styles.modalSub, { color: colors.textMuted }]}>
                Booking: {booking.bookingRef} — {booking.customerName}
              </Text>

              {amenityItems.map((item, idx) => (
                <View key={idx} style={styles.amenityRow}>
                  <TextInput
                    style={[styles.amenityNameInput, { borderColor: colors.border, color: colors.textPrimary }]}
                    value={item.name}
                    onChangeText={(v) => updateAmenityItem(idx, "name", v)}
                    placeholder="Item name (e.g. Gas, Electricity)"
                    placeholderTextColor={colors.textMuted}
                  />
                  <TextInput
                    style={[styles.amenityAmountInput, { borderColor: colors.border, color: colors.textPrimary }]}
                    value={item.amount}
                    onChangeText={(v) => updateAmenityItem(idx, "amount", v.replace(/[^0-9.]/g, ""))}
                    placeholder="₹"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                  />
                  <Pressable onPress={() => removeAmenityItem(idx)} hitSlop={8}>
                    <Feather name="trash-2" size={16} color={colors.destructive} />
                  </Pressable>
                </View>
              ))}

              <Pressable style={[styles.addItemBtn, { borderColor: colors.border }]} onPress={addAmenityItem}>
                <Feather name="plus" size={16} color={colors.primary} />
                <Text style={[styles.addItemText, { color: colors.primary }]}>Add Item</Text>
              </Pressable>

              <Text style={[styles.amenityTotal, { color: colors.textPrimary }]}>
                Total: ₹{amenityTotal.toLocaleString("en-IN")}
              </Text>

              <TextInput
                style={[styles.amenityNotesInput, { borderColor: colors.border, color: colors.textPrimary }]}
                value={amenityNotes}
                onChangeText={setAmenityNotes}
                placeholder="Notes (optional)"
                placeholderTextColor={colors.textMuted}
                multiline
              />

              <View style={styles.modalBtnRow}>
                <Pressable style={[styles.modalCancelBtn, { borderColor: colors.border }]} onPress={() => setShowAmenityModal(false)}>
                  <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>{t("cancel")}</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalConfirmBtn, { backgroundColor: colors.primary }]}
                  onPress={handleCreateAmenityBill}
                  disabled={creatingAmenity}
                >
                  {creatingAmenity ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalConfirmText}>{t("generateBill")}</Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
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
  headerInner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, height: 60 },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerDropdown: {
    position: "absolute", width: 200, borderRadius: 14, borderWidth: 1, padding: 6, zIndex: 100,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 10,
  },
  dropdownItem: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 10 },
  dropdownText: { fontSize: 14, fontWeight: "600" },
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
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
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
  advanceBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    marginTop: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderStyle: "dashed",
  },
  advanceBtnText: { fontSize: 14, fontWeight: "700" },
  smallAddBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  smallAddText: { fontSize: 12, fontWeight: "600" },
  emptyHint: { textAlign: "center", fontSize: 13, paddingVertical: 20 },
  billCard: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth,
  },
  billInfo: { flex: 1 },
  billTitle: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
  billMeta: { fontSize: 11 },
  billRight: { alignItems: "flex-end", gap: 6 },
  billAmount: { fontSize: 15, fontWeight: "800" },
  downloadPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  downloadPillText: { fontSize: 11, fontWeight: "600" },
  bottomActions: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 15, borderTopWidth: 1, borderTopColor: "#E5E7EB",
  },
  mainBtn: { height: 56, borderRadius: 16 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalContent: { borderRadius: 20, padding: 24 },
  amenityModal: { borderRadius: 20, padding: 24, marginHorizontal: 8 },
  modalTitle: { fontSize: 18, fontWeight: "800", marginBottom: 6 },
  modalSub: { fontSize: 13, marginBottom: 16 },
  modalInput: {
    borderWidth: 1.5, borderRadius: 14, padding: 14, fontSize: 15,
    textAlignVertical: "top", marginBottom: 16,
  },
  modalBtnRow: { flexDirection: "row", gap: 12 },
  modalCancelBtn: { flex: 1, height: 48, borderRadius: 14, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  modalCancelText: { fontSize: 15, fontWeight: "600" },
  modalConfirmBtn: { flex: 1, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  modalConfirmText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  amenityRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  amenityNameInput: { flex: 2, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  amenityAmountInput: { width: 80, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 10, fontSize: 14, textAlign: "right" },
  addItemBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderStyle: "dashed", marginTop: 4 },
  addItemText: { fontSize: 14, fontWeight: "600" },
  amenityTotal: { fontSize: 20, fontWeight: "800", textAlign: "right", marginTop: 12, marginBottom: 16 },
  amenityNotesInput: { borderWidth: 1.5, borderRadius: 14, padding: 12, fontSize: 13, minHeight: 60, textAlignVertical: "top", marginBottom: 16 },
});
