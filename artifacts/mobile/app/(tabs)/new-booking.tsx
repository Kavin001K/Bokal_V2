import { AnimatedButton } from "@/components/AnimatedButton";
import { Text, TextInput } from "@/components/Typography";
import { Feather } from "@expo/vector-icons";
import {
  useCheckAvailability,
  useCreateBooking,
  useGetVenues,
  useSearchCustomers,
  useGetBookings,
} from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useState, useMemo } from "react";
import { ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import StepIndicator from "@/components/StepIndicator";
import VenueCard from "@/components/VenueCard";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import {
  TAMIL_MONTHS,
  formatEnglishDate,
  gregorianToTamil,
  tamilToGregorian,
  todayStr,
} from "@/utils/tamilCalendar";

const STEPS = ["Customer", "Date & Time", "Venues", "Review"];

const TIME_OPTIONS: string[] = [];
for (let h = 6; h < 24; h++) {
  for (const m of [0, 30]) {
    if (h === 23 && m === 30) continue;
    TIME_OPTIONS.push(
      `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
    );
  }
}

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const period = h! >= 12 ? "PM" : "AM";
  const hour = h! % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

function calcDuration(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return (eh! * 60 + em! - sh! * 60 - sm!) / 60;
}

interface FormState {
  customerName: string;
  phoneNumbers: string[];
  address: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  selectedVenueIds: string[];
  customPrices: Record<string, number>;
  notes: string;
  tamilDateMode: boolean;
  tamilMonth: string;
  tamilDateNum: number;
  tamilYear: number;
  advanceAmount: string;
  isPaid: boolean;
}

const DEFAULT_FORM: FormState = {
  customerName: "",
  phoneNumbers: [""],
  address: "",
  bookingDate: todayStr(),
  startTime: "10:00",
  endTime: "14:00",
  selectedVenueIds: [],
  customPrices: {},
  notes: "",
  tamilDateMode: false,
  tamilMonth: "சித்திரை",
  tamilDateNum: 1,
  tamilYear: 2083,
  advanceAmount: "",
  isPaid: false,
};

export default function NewBookingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const { token } = useAuth();
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [createdBooking, setCreatedBooking] = useState<{ bookingRef: string; totalAmount: number; customerName: string } | null>(null);

  const { data: venuesData } = useGetVenues({ query: { queryKey: ["venues"] } });
  const venues = venuesData ?? [];

  const { data: customerResults } = useSearchCustomers(
    { q: searchQuery },
    { query: { queryKey: ["search-customers", searchQuery], enabled: searchQuery.length >= 2 } }
  );

  const { data: bookingsData } = useGetBookings(
    { date: form.bookingDate },
    { query: { queryKey: ["bookings", form.bookingDate] } }
  );

  // Fetch all bookings for a 6-month range to show busy days in calendar
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 1);
  const sixMonthsHence = new Date();
  sixMonthsHence.setMonth(sixMonthsHence.getMonth() + 5);
  
  const { data: allBookingsData } = useGetBookings(
    { 
      from: sixMonthsAgo.toISOString().split("T")[0], 
      to: sixMonthsHence.toISOString().split("T")[0],
      limit: 1000 
    },
    { query: { queryKey: ["all-bookings-range"] } }
  );

  const busyDates = useMemo(() => {
    const dates = new Set<string>();
    allBookingsData?.bookings?.forEach((b: any) => {
      if (b.status !== "cancelled") {
        dates.add(b.bookingDate);
      }
    });
    return dates;
  }, [allBookingsData]);
  
  const getConflictInfo = (venueId: string) => {
    const todaysBookings = bookingsData?.bookings ?? [];
    for (const b of todaysBookings) {
      if (b.status === "cancelled") continue;
      const hasVenue = b.venues.some((v: any) => v.venueId === venueId);
      if (!hasVenue) continue;
      // Overlap condition
      if (b.startTime < form.endTime && form.startTime < b.endTime) {
        return {
          bookingRef: b.bookingRef,
          customerName: b.customerName,
          startTime: b.startTime,
          endTime: b.endTime
        };
      }
    }
    return null;
  };

  const getBaseUrl = () => {
    const domain = process.env["EXPO_PUBLIC_DOMAIN"];
    const isLocal = domain?.includes("localhost") || domain?.includes("127.0.0.1") || domain?.includes("192.168.") || domain?.includes("10.0.");
    return domain ? `${isLocal ? "http" : "https"}://${domain}` : "https://bookal.onrender.com";
  };

  const handleDownloadPdf = async () => {
    if (!createdBooking) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const pdfUrl = `${getBaseUrl()}/api/bookings/${createdBooking.bookingRef}/pdf?token=${token}`;
      
      await WebBrowser.openBrowserAsync(pdfUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        controlsColor: colors.primary,
        toolbarColor: colors.background,
      });
    } catch (err) {
      Alert.alert("Error", "Could not open the receipt PDF.");
    }
  };

  // Focus Management Refs
  const nameRef = React.useRef<any>(null);
  const addressRef = React.useRef<any>(null);
  const phoneRefs = React.useRef<any[]>([]);

  // Add a new phone number and focus it
  const handleAddPhone = () => {
    const newIdx = form.phoneNumbers.length;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateField("phoneNumbers", [...form.phoneNumbers, ""]);
    
    // Slight delay to allow the new input to render
    setTimeout(() => {
      phoneRefs.current[newIdx]?.focus();
    }, 100);
  };

  const focusNext = (currentIdx: number) => {
    if (currentIdx < form.phoneNumbers.length - 1) {
      phoneRefs.current[currentIdx + 1]?.focus();
    } else {
      addressRef.current?.focus();
    }
  };

  const createMutation = useCreateBooking({
    mutation: {
      onSuccess: (data) => {
        setCreatedBooking({ bookingRef: data.bookingRef, totalAmount: data.totalAmount, customerName: data.customerName });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
      onError: (err: { data?: { error?: string } }) => {
        Alert.alert("Booking Failed", err?.data?.error ?? "Failed to create booking");
      },
    },
  });

  const durationHours = calcDuration(form.startTime, form.endTime);
  const totalAmount = form.selectedVenueIds.reduce((sum, vid) => {
    const venue = venues.find((v) => v.id === vid);
    const price = form.customPrices[vid] ?? Number(venue?.pricePerHour ?? 0);
    return sum + price * durationHours;
  }, 0);

  const tamilDate = gregorianToTamil(form.bookingDate);

  const updateField = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleDateSelect = (dateStr: string) => {
    updateField("bookingDate", dateStr);
    const td = gregorianToTamil(dateStr);
    setForm((f) => ({
      ...f,
      bookingDate: dateStr,
      tamilMonth: td.tamilMonth,
      tamilDateNum: td.tamilDate,
      tamilYear: td.tamilYear,
    }));
  };

  const handleTamilDateChange = (month: string, date: number, year: number) => {
    const greg = tamilToGregorian(month, date, year);
    setForm((f) => ({
      ...f,
      tamilMonth: month,
      tamilDateNum: date,
      tamilYear: year,
      bookingDate: greg,
    }));
  };

  const canProceed = (): boolean => {
    if (step === 0) return form.customerName.trim().length > 0 && form.phoneNumbers[0]!.trim().length >= 10;
    if (step === 1) return durationHours > 0;
    if (step === 2) return form.selectedVenueIds.length > 0;
    return true;
  };

  const handleNext = () => {
    if (!canProceed()) {
      Alert.alert("Required", step === 0 ? "Enter customer name and phone" : step === 1 ? "Select valid times" : "Select at least one venue");
      return;
    }
    
    if (step === 1) {
      const invalidVenues = form.selectedVenueIds.filter(vid => !!getConflictInfo(vid));
      if (invalidVenues.length > 0) {
        setForm(f => ({ ...f, selectedVenueIds: f.selectedVenueIds.filter(vid => !invalidVenues.includes(vid)) }));
      }
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep((s) => s + 1);
  };

  const handleSubmit = () => {
    const venuePayload = form.selectedVenueIds.map((vid) => {
      const venue = venues.find((v) => v.id === vid);
      return {
        venueId: vid,
        pricePerHour: form.customPrices[vid] ?? Number(venue?.pricePerHour ?? 0),
      };
    });

    createMutation.mutate({
      data: {
        customerName: form.customerName.trim(),
        phoneNumbers: form.phoneNumbers.filter((p) => p.trim()),
        address: form.address.trim() || undefined,
        bookingDate: form.bookingDate,
        tamilDateLabel: tamilDate.display,
        startTime: form.startTime,
        endTime: form.endTime,
        venues: venuePayload,
        advanceAmount: parseFloat(form.advanceAmount) || 0,
        isPaid: form.isPaid,
        notes: form.notes.trim() || undefined,
      },
    });
  };

  const resetForm = () => {
    setForm(DEFAULT_FORM);
    setStep(0);
    setCreatedBooking(null);
  };

  if (createdBooking) {
    return (
      <View style={[styles.container, styles.successContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.successCard, { backgroundColor: colors.card }]}>
          <View style={[styles.successIcon, { backgroundColor: colors.success + "20" }]}>
            <Feather name="check-circle" size={40} color={colors.success} />
          </View>
          <Text style={[styles.successTitle, { color: colors.textPrimary }]}>Booking Created!</Text>
          <Text style={[styles.successRef, { color: colors.primary }]}>{createdBooking.bookingRef}</Text>
          <Text style={[styles.successCustomer, { color: colors.textSecondary }]}>{createdBooking.customerName}</Text>
          <Text style={[styles.successAmount, { color: colors.primary }]}>
            ₹{createdBooking.totalAmount.toLocaleString("en-IN")}
          </Text>
          <View style={styles.successBtns}>
            <AnimatedButton style={[styles.successBtn, { backgroundColor: colors.secondary }]} onPress={resetForm} scaleTo={0.96}>
              <Text style={[styles.successBtnText, { color: colors.textPrimary }]}>New Booking</Text>
            </AnimatedButton>
            <AnimatedButton
              style={[styles.successBtn, { backgroundColor: colors.primary }]}
              onPress={() => { resetForm(); router.push("/(tabs)"); }}
              scaleTo={0.96}
            >
              <Text style={[styles.successBtnText, { color: "#fff" }]}>Go Home</Text>
            </AnimatedButton>
          </View>

          <AnimatedButton 
            style={[styles.downloadPdfBtn, { borderColor: colors.primary }]} 
            onPress={handleDownloadPdf}
            scaleTo={0.98}
          >
            <Feather name="file-text" size={18} color={colors.primary} />
            <Text style={[styles.downloadPdfText, { color: colors.primary }]}>View/Download Receipt PDF</Text>
          </AnimatedButton>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <Pressable 
          onPress={() => {
            if (step > 0) {
              setStep((s) => s - 1);
            } else if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(tabs)");
            }
          }} 
          hitSlop={8}
        >
          <Feather name="arrow-left" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>New Booking</Text>
        <View style={{ width: 22 }} />
      </View>

      <StepIndicator steps={STEPS} currentStep={step} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 0 && (
          <View>
            <Pressable
              style={[styles.searchToggle, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setShowSearch((v) => !v)}
            >
              <Feather name="search" size={16} color={colors.textMuted} />
              <Text style={[styles.searchToggleText, { color: colors.textMuted }]}>Search existing customer...</Text>
            </Pressable>

            {showSearch && (
              <View style={[styles.searchPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.searchField, { color: colors.textPrimary, borderColor: colors.border }]}
                  placeholder="Name or phone..."
                  placeholderTextColor={colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                />
                {(customerResults ?? []).map((c, i) => (
                  <Pressable
                    key={i}
                    style={[styles.customerResult, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      setForm((f) => ({
                        ...f,
                        customerName: c.customerName,
                        phoneNumbers: c.phoneNumbers.length > 0 ? c.phoneNumbers : [""],
                        address: c.address ?? "",
                      }));
                      setShowSearch(false);
                      setSearchQuery("");
                    }}
                  >
                    <Text style={[styles.resultName, { color: colors.textPrimary }]}>{c.customerName}</Text>
                    <Text style={[styles.resultPhone, { color: colors.textMuted }]}>{c.phoneNumbers[0]}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <FormField label="Customer Name *">
              <TextInput
                ref={nameRef}
                style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }]}
                placeholder="Enter customer name..."
                placeholderTextColor={colors.textMuted}
                value={form.customerName}
                onChangeText={(t) => updateField("customerName", t)}
                autoFocus={true}
                returnKeyType="next"
                onSubmitEditing={() => phoneRefs.current[0]?.focus()}
                blurOnSubmit={false}
              />
            </FormField>

            <FormField label="Phone Numbers *">
              {form.phoneNumbers.map((phone, idx) => (
                <View key={idx} style={styles.phoneRow}>
                  <View style={[styles.phonePrefixBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                    <Text style={[styles.phonePrefixText, { color: colors.textSecondary }]}>+91</Text>
                  </View>
                  <TextInput
                    ref={(el) => { phoneRefs.current[idx] = el; }}
                    style={[styles.phoneInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }]}
                    placeholder="98765 43210"
                    placeholderTextColor={colors.textMuted}
                    value={phone}
                    onChangeText={(t) => {
                      const nums = [...form.phoneNumbers];
                      nums[idx] = t.replace(/\D/g, "").slice(0, 10);
                      updateField("phoneNumbers", nums);
                    }}
                    keyboardType="number-pad"
                    maxLength={10}
                    returnKeyType={idx === form.phoneNumbers.length - 1 ? "done" : "next"}
                    onSubmitEditing={() => focusNext(idx)}
                    blurOnSubmit={idx === form.phoneNumbers.length - 1}
                  />
                  {idx > 0 && (
                    <Pressable
                      onPress={() => updateField("phoneNumbers", form.phoneNumbers.filter((_, i) => i !== idx))}
                      hitSlop={8}
                      style={styles.removeBtn}
                    >
                      <Feather name="x-circle" size={18} color={colors.destructive} />
                    </Pressable>
                  )}
                </View>
              ))}
              {form.phoneNumbers.length < 5 && (
                <AnimatedButton
                  style={[styles.addPhoneBtn, { borderColor: colors.primary }]}
                  onPress={handleAddPhone}
                  scaleTo={0.97}
                >
                  <Feather name="plus" size={14} color={colors.primary} />
                  <Text style={[styles.addPhoneText, { color: colors.primary }]}>Add phone</Text>
                </AnimatedButton>
              )}
            </FormField>

            <FormField label="Address (optional)">
              <TextInput
                ref={addressRef}
                style={[styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }]}
                placeholder="Customer address..."
                placeholderTextColor={colors.textMuted}
                value={form.address}
                onChangeText={(t) => updateField("address", t)}
                multiline
                numberOfLines={3}
              />
            </FormField>
          </View>
        )}

        {step === 1 && (
          <View>
            <View style={[styles.dateToggle, { backgroundColor: colors.secondary, borderRadius: 12 }]}>
              <Pressable
                style={[styles.dateToggleBtn, !form.tamilDateMode && { backgroundColor: colors.card, borderRadius: 10 }]}
                onPress={() => updateField("tamilDateMode", false)}
              >
                <Text style={[styles.dateToggleText, { color: !form.tamilDateMode ? colors.primary : colors.textMuted }]}>
                  English
                </Text>
              </Pressable>
              <Pressable
                style={[styles.dateToggleBtn, form.tamilDateMode && { backgroundColor: colors.card, borderRadius: 10 }]}
                onPress={() => updateField("tamilDateMode", true)}
              >
                <Text style={[styles.dateToggleText, { color: form.tamilDateMode ? colors.primary : colors.textMuted }]}>
                  தமிழ்
                </Text>
              </Pressable>
            </View>

            {!form.tamilDateMode ? (
              <View style={styles.calendarContainer}>
                <SimpleCalendar
                  selectedDate={form.bookingDate}
                  onSelect={handleDateSelect}
                  colors={colors}
                  busyDates={busyDates}
                />
                <View style={styles.calLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.destructive }]} />
                    <Text style={[styles.legendText, { color: colors.textSecondary }]}>Occupied (1+ Booking)</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                    <Text style={[styles.legendText, { color: colors.textSecondary }]}>Selected</Text>
                  </View>
                </View>
                <View style={[styles.tamilNote, { backgroundColor: colors.secondary }]}>
                  <Feather name="calendar" size={13} color={colors.primary} />
                  <Text style={[styles.tamilNoteText, { color: colors.textSecondary }]}>
                    {tamilDate.display}
                  </Text>
                </View>
              </View>
            ) : (
              <View>
                <FormField label="Tamil Month">
                  <View style={styles.pickerWrap}>
                    <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                      {TAMIL_MONTHS.map((m) => (
                        <Pressable
                          key={m}
                          style={[styles.pickerItem, form.tamilMonth === m && { backgroundColor: colors.primary + "20" }]}
                          onPress={() => handleTamilDateChange(m, form.tamilDateNum, form.tamilYear)}
                        >
                          <Text style={[styles.pickerItemText, { color: form.tamilMonth === m ? colors.primary : colors.textPrimary }]}>
                            {m}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                </FormField>
                <View style={styles.tamilDateRow}>
                  <FormField label="Date" style={{ flex: 1 }}>
                    <View style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: "row", alignItems: "center", gap: 8 }]}>
                      <Pressable onPress={() => handleTamilDateChange(form.tamilMonth, Math.max(1, form.tamilDateNum - 1), form.tamilYear)}>
                        <Feather name="minus" size={16} color={colors.primary} />
                      </Pressable>
                      <Text style={{ flex: 1, textAlign: "center", color: colors.textPrimary, fontSize: 16, fontWeight: "700" as const }}>
                        {form.tamilDateNum}
                      </Text>
                      <Pressable onPress={() => handleTamilDateChange(form.tamilMonth, Math.min(30, form.tamilDateNum + 1), form.tamilYear)}>
                        <Feather name="plus" size={16} color={colors.primary} />
                      </Pressable>
                    </View>
                  </FormField>
                  <FormField label="Year" style={{ flex: 1 }}>
                    <View style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: "row", alignItems: "center", gap: 8 }]}>
                      <Pressable onPress={() => handleTamilDateChange(form.tamilMonth, form.tamilDateNum, form.tamilYear - 1)}>
                        <Feather name="minus" size={16} color={colors.primary} />
                      </Pressable>
                      <Text style={{ flex: 1, textAlign: "center", color: colors.textPrimary, fontSize: 16, fontWeight: "700" as const }}>
                        {form.tamilYear}
                      </Text>
                      <Pressable onPress={() => handleTamilDateChange(form.tamilMonth, form.tamilDateNum, form.tamilYear + 1)}>
                        <Feather name="plus" size={16} color={colors.primary} />
                      </Pressable>
                    </View>
                  </FormField>
                </View>
                <View style={[styles.tamilNote, { backgroundColor: colors.secondary }]}>
                  <Feather name="calendar" size={13} color={colors.primary} />
                  <Text style={[styles.tamilNoteText, { color: colors.textSecondary }]}>
                    English: {formatEnglishDate(form.bookingDate)}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.timeRow}>
              <FormField label="Start Time" style={{ flex: 1 }}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ maxHeight: 44 }}
                >
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {TIME_OPTIONS.map((t) => (
                      <Pressable
                        key={t}
                        style={[
                          styles.timeChip,
                          {
                            backgroundColor: form.startTime === t ? colors.primary : colors.card,
                            borderColor: form.startTime === t ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => updateField("startTime", t)}
                      >
                        <Text style={[styles.timeChipText, { color: form.startTime === t ? "#fff" : colors.textSecondary }]}>
                          {formatTime(t)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </FormField>
            </View>

            <View style={styles.timeRow}>
              <FormField label="End Time" style={{ flex: 1 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 44 }}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {TIME_OPTIONS.filter((t) => t > form.startTime).map((t) => (
                      <Pressable
                        key={t}
                        style={[
                          styles.timeChip,
                          {
                            backgroundColor: form.endTime === t ? colors.primary : colors.card,
                            borderColor: form.endTime === t ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => updateField("endTime", t)}
                      >
                        <Text style={[styles.timeChipText, { color: form.endTime === t ? "#fff" : colors.textSecondary }]}>
                          {formatTime(t)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </FormField>
            </View>

            {durationHours > 0 && (
              <View style={[styles.durationBadge, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40" }]}>
                <Feather name="clock" size={14} color={colors.primary} />
                <Text style={[styles.durationText, { color: colors.primary }]}>
                  Duration: {durationHours} hour{durationHours !== 1 ? "s" : ""}
                </Text>
              </View>
            )}
          </View>
        )}

        {step === 2 && (
          <View>
            <View style={styles.venueGrid}>
              {venues.map((venue) => {
                const conflict = getConflictInfo(venue.id);
                return (
                  <View key={venue.id} style={styles.venueGridItem}>
                    <VenueCard
                      venue={venue}
                      isSelected={form.selectedVenueIds.includes(venue.id)}
                      isDisabled={!!conflict}
                      conflictInfo={conflict}
                      durationHours={durationHours}
                      customPrice={form.customPrices[venue.id]}
                      onToggle={() => {
                        const ids = form.selectedVenueIds.includes(venue.id)
                          ? form.selectedVenueIds.filter((id) => id !== venue.id)
                          : [...form.selectedVenueIds, venue.id];
                        updateField("selectedVenueIds", ids);
                      }}
                      onPriceChange={(price) => updateField("customPrices", { ...form.customPrices, [venue.id]: price })}
                    />
                  </View>
                );
              })}
            </View>

            {form.selectedVenueIds.length > 0 && (
              <View style={[styles.totalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.totalCardTitle, { color: colors.textPrimary }]}>Booking Total</Text>
                {form.selectedVenueIds.map((vid) => {
                  const venue = venues.find((v) => v.id === vid);
                  const price = form.customPrices[vid] ?? Number(venue?.pricePerHour ?? 0);
                  const sub = price * durationHours;
                  return (
                    <View key={vid} style={styles.totalRow}>
                      <Text style={[styles.totalRowLabel, { color: colors.textSecondary }]}>
                        {venue?.name} ({durationHours}h × ₹{price.toLocaleString("en-IN")})
                      </Text>
                      <Text style={[styles.totalRowValue, { color: colors.textPrimary }]}>₹{sub.toLocaleString("en-IN")}</Text>
                    </View>
                  );
                })}
                <View style={[styles.totalDivider, { backgroundColor: colors.border }]} />
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: colors.textPrimary }]}>TOTAL</Text>
                  <Text style={[styles.totalValue, { color: colors.primary }]}>₹{totalAmount.toLocaleString("en-IN")}</Text>
                </View>
              </View>
            )}

            <FormField label="Notes (optional)">
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }]}
                placeholder="Special requirements..."
                placeholderTextColor={colors.textMuted}
                value={form.notes}
                onChangeText={(t) => updateField("notes", t)}
                multiline
                numberOfLines={3}
              />
            </FormField>
          </View>
        )}

        {step === 3 && (
          <View>
            <ReviewSection title="Customer" colors={colors}>
              <ReviewRow label="Name" value={form.customerName} colors={colors} />
              <ReviewRow label="Phone" value={form.phoneNumbers.filter(Boolean).join(", ")} colors={colors} />
              {form.address ? <ReviewRow label="Address" value={form.address} colors={colors} /> : null}
            </ReviewSection>

            <ReviewSection title="Date & Time" colors={colors}>
              <ReviewRow label="Date" value={formatEnglishDate(form.bookingDate)} colors={colors} />
              <ReviewRow label="Tamil Date" value={tamilDate.display} colors={colors} />
              <ReviewRow label="Time" value={`${formatTime(form.startTime)} – ${formatTime(form.endTime)} (${durationHours}h)`} colors={colors} />
            </ReviewSection>

            <ReviewSection title="Venue & Pricing" colors={colors}>
              {form.selectedVenueIds.map((vid) => {
                const venue = venues.find((v) => v.id === vid);
                const price = form.customPrices[vid] ?? Number(venue?.pricePerHour ?? 0);
                return (
                  <ReviewRow
                    key={vid}
                    label={venue?.name ?? vid}
                    value={`₹${(price * durationHours).toLocaleString("en-IN")}`}
                    colors={colors}
                  />
                );
              })}
              <View style={[styles.reviewTotal, { borderTopColor: colors.border }]}>
                <Text style={[styles.reviewTotalLabel, { color: colors.textPrimary }]}>TOTAL</Text>
                <Text style={[styles.reviewTotalValue, { color: colors.primary }]}>₹{totalAmount.toLocaleString("en-IN")}</Text>
              </View>
            </ReviewSection>

            <ReviewSection title="Payment Details" colors={colors}>
              <View style={styles.paymentField}>
                <Text style={[styles.reviewLabel, { color: colors.textMuted }]}>Advance Amount</Text>
                <TextInput
                  style={[styles.advanceInput, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.primary }]}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  value={form.advanceAmount}
                  onChangeText={(t) => updateField("advanceAmount", t)}
                  keyboardType="number-pad"
                />
              </View>
              <Pressable 
                style={styles.paidToggle} 
                onPress={() => updateField("isPaid", !form.isPaid)}
              >
                <View style={[styles.checkbox, { borderColor: colors.primary, backgroundColor: form.isPaid ? colors.primary : "transparent" }]}>
                  {form.isPaid && <Feather name="check" size={12} color="#fff" />}
                </View>
                <Text style={[styles.paidToggleText, { color: colors.textPrimary }]}>Mark as Fully Paid</Text>
              </Pressable>
            </ReviewSection>

            {form.notes ? (
              <ReviewSection title="Notes" colors={colors}>
                <Text style={[styles.notesText, { color: colors.textSecondary }]}>{form.notes}</Text>
              </ReviewSection>
            ) : null}
          </View>
        )}
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + 80, // Increased to clear the tab bar
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        ]}
      >
        <View style={styles.footerBtns}>
          {step > 0 && step < 3 && (
            <AnimatedButton
              style={[styles.backBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setStep((s) => s - 1); }}
            >
              <Feather name="arrow-left" size={18} color={colors.textSecondary} />
              <Text style={[styles.backBtnText, { color: colors.textSecondary }]}>Back</Text>
            </AnimatedButton>
          )}
          {step === 3 && (
            <AnimatedButton
              style={[styles.backBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              onPress={() => setStep(0)}
            >
              <Feather name="edit-2" size={16} color={colors.textSecondary} />
              <Text style={[styles.backBtnText, { color: colors.textSecondary }]}>Edit</Text>
            </AnimatedButton>
          )}
          {step < 3 ? (
            <AnimatedButton
              style={[
                styles.nextBtn,
                { backgroundColor: canProceed() ? colors.primary : colors.textMuted, flex: 1 },
              ]}
              onPress={handleNext}
              disabled={!canProceed()}
            >
              <Text style={styles.nextBtnText}>
                {step === 2 ? "Review Booking" : "Continue"}
              </Text>
              <Feather name="arrow-right" size={18} color="#fff" />
            </AnimatedButton>
          ) : (
            <AnimatedButton
              style={[
                styles.nextBtn,
                { backgroundColor: colors.primary, flex: 1 },
              ]}
              onPress={handleSubmit}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="check-circle" size={18} color="#fff" />
                  <Text style={styles.nextBtnText}>Create Booking</Text>
                </>
              )}
            </AnimatedButton>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function FormField({ label, children, style }: { label: string; children: React.ReactNode; style?: object }) {
  const colors = useColors();
  return (
    <View style={[styles.formField, style]}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      {children}
    </View>
  );
}

function ReviewSection({ title, children, colors }: { title: string; children: React.ReactNode; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.reviewSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.reviewSectionTitle, { color: colors.primary }]}>{title}</Text>
      {children}
    </View>
  );
}

function ReviewRow({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.reviewRow}>
      <Text style={[styles.reviewLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.reviewValue, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

function SimpleCalendar({ selectedDate, onSelect, colors, busyDates }: { 
  selectedDate: string; 
  onSelect: (d: string) => void; 
  colors: ReturnType<typeof useColors>;
  busyDates?: Set<string>;
}) {
  const today = todayStr();
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date(selectedDate + "T00:00:00");
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const firstDay = new Date(viewDate.year, viewDate.month, 1).getDay();
  const daysInMonth = new Date(viewDate.year, viewDate.month + 1, 0).getDate();
  const cells = Array(firstDay).fill(null).concat(
    Array.from({ length: daysInMonth }, (_, i) => i + 1)
  );

  const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
  const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <View style={[styles.calendar, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.calHeader}>
        <Pressable onPress={() => setViewDate((d) => {
          const m = d.month === 0 ? 11 : d.month - 1;
          const y = d.month === 0 ? d.year - 1 : d.year;
          return { year: y, month: m };
        })} hitSlop={8}>
          <Feather name="chevron-left" size={20} color={colors.textSecondary} />
        </Pressable>
        <Text style={[styles.calMonthYear, { color: colors.textPrimary }]}>
          {MONTH_NAMES[viewDate.month]} {viewDate.year}
        </Text>
        <Pressable onPress={() => setViewDate((d) => {
          const m = d.month === 11 ? 0 : d.month + 1;
          const y = d.month === 11 ? d.year + 1 : d.year;
          return { year: y, month: m };
        })} hitSlop={8}>
          <Feather name="chevron-right" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>
      <View style={styles.calDayLabels}>
        {DAY_LABELS.map((d, i) => (
          <Text key={i} style={[styles.calDayLabel, { color: colors.textMuted }]}>{d}</Text>
        ))}
      </View>
      <View style={styles.calGrid}>
        {cells.map((day, idx) => {
          if (!day) return <View key={idx} style={styles.calCell} />;
          const dateStr = `${viewDate.year}-${String(viewDate.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isPast = dateStr < today;
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === today;
            const isBusy = busyDates?.has(dateStr);
            return (
              <Pressable
                key={idx}
                style={[
                  styles.calCell,
                  isSelected && { backgroundColor: colors.primary, borderRadius: 8 },
                  isToday && !isSelected && { borderWidth: 1.5, borderColor: colors.primary, borderRadius: 8 },
                  !isSelected && isBusy && { backgroundColor: colors.destructive + "15" },
                ]}
                onPress={() => !isPast && onSelect(dateStr)}
                disabled={isPast}
              >
                <Text
                  style={[
                    styles.calDayText,
                    { color: isPast ? colors.textMuted : isSelected ? "#fff" : isBusy ? colors.destructive : colors.textPrimary },
                  ]}
                >
                  {day}
                </Text>
                {!isSelected && isBusy && <View style={[styles.busyDot, { backgroundColor: colors.destructive }]} />}
              </Pressable>
            );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 18, fontWeight: "700" as const },
  scroll: { flex: 1 },
  searchToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  searchToggleText: { fontSize: 14 },
  searchPanel: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
  },
  searchField: {
    padding: 12,
    fontSize: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  customerResult: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultName: { fontSize: 14, fontWeight: "600" as const },
  resultPhone: { fontSize: 12, marginTop: 2 },
  formField: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: "600" as const, marginBottom: 8 },
  textInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    fontSize: 15,
  },
  textArea: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    minHeight: 90,
    textAlignVertical: "top",
  },
  phoneRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  phonePrefixBox: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
    justifyContent: "center",
  },
  phonePrefixText: { fontSize: 14, fontWeight: "600" as const },
  phoneInput: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    fontSize: 15,
  },
  removeBtn: { padding: 4 },
  addPhoneBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 10,
    padding: 12,
    justifyContent: "center",
  },
  addPhoneText: { fontSize: 13, fontWeight: "600" as const },
  dateToggle: {
    flexDirection: "row",
    padding: 4,
    marginBottom: 16,
  },
  dateToggleBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  dateToggleText: { fontSize: 14, fontWeight: "600" as const },
  calendarContainer: { marginBottom: 16 },
  calendar: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  calHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  calMonthYear: { fontSize: 15, fontWeight: "700" as const },
  calDayLabels: { flexDirection: "row", marginBottom: 8 },
  calDayLabel: { flex: 1, textAlign: "center", fontSize: 11, fontWeight: "600" as const },
  calGrid: { flexDirection: "row", flexWrap: "wrap" },
  calCell: { width: "14.28%", aspectRatio: 1, alignItems: "center", justifyContent: "center", position: "relative" },
  calDayText: { fontSize: 13, fontWeight: "600" as const },
  busyDot: {
    position: "absolute",
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  calLegend: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: "500" as const,
  },
  tamilNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  tamilNoteText: { fontSize: 13, flex: 1 },
  pickerWrap: { maxHeight: 200, borderWidth: 1.5, borderRadius: 12, overflow: "hidden" },
  pickerScroll: {},
  pickerItem: { padding: 12 },
  pickerItemText: { fontSize: 15 },
  tamilDateRow: { flexDirection: "row", gap: 12 },
  timeRow: { marginBottom: 12 },
  timeChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  timeChipText: { fontSize: 12, fontWeight: "600" as const },
  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  durationText: { fontSize: 13, fontWeight: "600" as const },
  venueGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 16 },
  venueGridItem: { width: "47.5%" },
  totalCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  totalCardTitle: { fontSize: 14, fontWeight: "700" as const, marginBottom: 12 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  totalRowLabel: { fontSize: 12, flex: 1 },
  totalRowValue: { fontSize: 13, fontWeight: "600" as const },
  totalDivider: { height: 1, marginVertical: 8 },
  totalLabel: { fontSize: 14, fontWeight: "700" as const },
  totalValue: { fontSize: 18, fontWeight: "800" as const },
  reviewSection: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  reviewSectionTitle: { fontSize: 11, fontWeight: "700" as const, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 },
  reviewRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  reviewLabel: { fontSize: 13, flex: 1 },
  reviewValue: { fontSize: 13, fontWeight: "600" as const, flex: 1, textAlign: "right" },
  reviewTotal: { flexDirection: "row", justifyContent: "space-between", marginTop: 8, paddingTop: 10, borderTopWidth: 1 },
  reviewTotalLabel: { fontSize: 14, fontWeight: "700" as const },
  reviewTotalValue: { fontSize: 18, fontWeight: "800" as const },
  notesText: { fontSize: 13, lineHeight: 20 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    elevation: 10,
  },
  footerBtns: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 54,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  backBtnText: { fontSize: 14, fontWeight: "600" as const },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 54,
    borderRadius: 14,
    flex: 1,
    boxShadow: '0px 4px 10px rgba(199, 91, 42, 0.25)',
    elevation: 5,
  },
  nextBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" as const },
  successContainer: { justifyContent: "center", alignItems: "center", padding: 20 },
  successCard: {
    width: "100%",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.08)',
    elevation: 6,
  },
  successIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  paymentField: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  advanceInput: {
    width: 120,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: "700" as const,
    textAlign: "right",
  },
  paidToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
    paddingVertical: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  paidToggleText: {
    fontSize: 14,
    fontWeight: "600" as const,
  },
  successTitle: { fontSize: 22, fontWeight: "800" as const, marginBottom: 8 },
  successRef: { fontSize: 16, fontWeight: "700" as const, marginBottom: 4 },
  successCustomer: { fontSize: 14, marginBottom: 8 },
  successAmount: { fontSize: 26, fontWeight: "800" as const, marginBottom: 24 },
  successBtns: { flexDirection: "row", gap: 12, width: "100%" },
  successBtn: { flex: 1, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  successBtnText: { fontSize: 14, fontWeight: "700" as const },
  downloadPdfBtn: {
    marginTop: 24,
    width: "100%",
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderStyle: "dashed",
  },
  downloadPdfText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
