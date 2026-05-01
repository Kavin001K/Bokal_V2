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
import type { Venue } from "@workspace/api-client-react";

interface ConflictInfo {
  bookingRef: string;
  customerName: string;
  startTime: string;
  endTime: string;
}

interface VenueCardProps {
  venue: Venue;
  isSelected: boolean;
  isDisabled: boolean;
  conflictInfo?: ConflictInfo | null;
  durationHours: number;
  customPrice?: number;
  onToggle: () => void;
  onPriceChange: (price: number) => void;
}

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const period = h! >= 12 ? "PM" : "AM";
  const hour = h! % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

export default function VenueCard({
  venue,
  isSelected,
  isDisabled,
  conflictInfo,
  durationHours,
  customPrice,
  onToggle,
  onPriceChange,
}: VenueCardProps) {
  const colors = useColors();
  const scale = useSharedValue(1);

  const effectivePrice = customPrice ?? Number(venue.pricePerHour);
  const subtotal = effectivePrice * durationHours;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (isDisabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  };

  const icon = venue.type === "mahal" ? "home" : "wind";

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={handlePress}
        onPressIn={() => {
          if (!isDisabled) scale.value = withSpring(0.97, { damping: 20 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 20 });
        }}
        style={[
          styles.card,
          {
            backgroundColor: isDisabled
              ? colors.muted
              : isSelected
              ? colors.primary + "12"
              : colors.card,
            borderColor: isDisabled
              ? colors.border
              : isSelected
              ? colors.primary
              : colors.border,
            borderWidth: isSelected ? 2 : 1,
            opacity: isDisabled ? 0.6 : 1,
          },
        ]}
      >
        <View style={styles.header}>
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: isSelected
                  ? colors.primary
                  : colors.secondary,
              },
            ]}
          >
            <Feather
              name={icon}
              size={18}
              color={isSelected ? "#fff" : colors.primary}
            />
          </View>
          {isSelected && (
            <View
              style={[styles.checkBadge, { backgroundColor: colors.primary }]}
            >
              <Feather name="check" size={10} color="#fff" />
            </View>
          )}
          {isDisabled && (
            <View
              style={[
                styles.bookedBadge,
                { backgroundColor: colors.destructive },
              ]}
            >
              <Text style={styles.bookedText}>Booked</Text>
            </View>
          )}
        </View>

        <Text
          style={[
            styles.venueName,
            {
              color: isDisabled ? colors.textMuted : colors.textPrimary,
            },
          ]}
        >
          {venue.name}
        </Text>

        <Text style={[styles.price, { color: colors.textSecondary }]}>
          ₹{Number(venue.pricePerHour).toLocaleString("en-IN")}/hr
        </Text>

        {isDisabled && conflictInfo ? (
          <Text style={[styles.conflictText, { color: colors.destructive }]} numberOfLines={2}>
            {conflictInfo.customerName} {formatTime(conflictInfo.startTime)}–
            {formatTime(conflictInfo.endTime)}
          </Text>
        ) : null}

        {isSelected && durationHours > 0 ? (
          <View
            style={[
              styles.subtotalRow,
              { borderTopColor: colors.primary + "33" },
            ]}
          >
            <Text style={[styles.subtotalLabel, { color: colors.textMuted }]}>
              {durationHours}h × ₹{effectivePrice.toLocaleString("en-IN")}
            </Text>
            <Text style={[styles.subtotal, { color: colors.primary }]}>
              ₹{subtotal.toLocaleString("en-IN")}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  checkBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  bookedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  bookedText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700" as const,
  },
  venueName: {
    fontSize: 14,
    fontWeight: "700" as const,
    marginBottom: 2,
  },
  price: {
    fontSize: 12,
  },
  conflictText: {
    fontSize: 10,
    marginTop: 4,
  },
  subtotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  subtotalLabel: {
    fontSize: 11,
  },
  subtotal: {
    fontSize: 13,
    fontWeight: "700" as const,
  },
});
