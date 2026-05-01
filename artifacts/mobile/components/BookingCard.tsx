import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useColors } from "@/hooks/useColors";
import type { Booking } from "@workspace/api-client-react";

interface BookingCardProps {
  booking: Booking;
  onPress?: () => void;
}

function getStatusColor(
  status: string,
  bookingDate: string,
  colors: ReturnType<typeof useColors>
): string {
  if (status === "cancelled") return colors.destructive;
  if (status === "completed") return colors.success;
  const today = new Date().toISOString().split("T")[0]!;
  if (bookingDate === today) return colors.primary;
  return colors.warning;
}

function getStatusLabel(status: string, bookingDate: string): string {
  if (status === "cancelled") return "Cancelled";
  if (status === "completed") return "Completed";
  const today = new Date().toISOString().split("T")[0]!;
  if (bookingDate === today) return "Today";
  return "Confirmed";
}

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const period = h! >= 12 ? "PM" : "AM";
  const hour = h! % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function BookingCard({ booking, onPress }: BookingCardProps) {
  const colors = useColors();
  const scale = useSharedValue(1);

  const statusColor = getStatusColor(booking.status, booking.bookingDate, colors);
  const statusLabel = getStatusLabel(booking.status, booking.bookingDate);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 20 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 20 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  const venueName = booking.venues?.map((v) => v.venueName).join(" + ") ?? "";

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderLeftColor: statusColor,
          },
        ]}
      >
        <View style={styles.topRow}>
          <View style={styles.venueRow}>
            <Feather name="home" size={13} color={colors.textSecondary} />
            <Text
              style={[styles.venueName, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {venueName || "No venue"}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: statusColor + "22" }]}>
            <View style={[styles.dot, { backgroundColor: statusColor }]} />
            <Text style={[styles.badgeText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
        </View>

        <Text style={[styles.customerName, { color: colors.textPrimary }]} numberOfLines={1}>
          {booking.customerName}
        </Text>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Feather name="calendar" size={12} color={colors.textMuted} />
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
              {new Date(booking.bookingDate + "T00:00:00").toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Feather name="clock" size={12} color={colors.textMuted} />
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
              {formatTime(booking.startTime)} – {formatTime(booking.endTime)}
            </Text>
          </View>
        </View>

        {booking.tamilDateLabel ? (
          <Text style={[styles.tamilDate, { color: colors.textMuted }]}>
            {booking.tamilDateLabel}
          </Text>
        ) : null}

        <View style={styles.bottomRow}>
          <View style={styles.detailItem}>
            <Feather name="phone" size={12} color={colors.textMuted} />
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
              {(booking.phoneNumbers?.[0] ?? "").replace(/(\d{5})(\d{5})/, "$1 $2")}
            </Text>
          </View>
          <Text style={[styles.amount, { color: colors.primary }]}>
            {formatAmount(booking.totalAmount)}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#C75B2A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  venueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  venueName: {
    fontSize: 12,
    fontWeight: "500" as const,
    flex: 1,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "700" as const,
    marginBottom: 8,
  },
  detailsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 4,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detailText: {
    fontSize: 12,
  },
  tamilDate: {
    fontSize: 11,
    marginBottom: 6,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E8DDD4",
  },
  amount: {
    fontSize: 16,
    fontWeight: "700" as const,
  },
});
