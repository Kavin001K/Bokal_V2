import { Text, TextInput } from "@/components/Typography";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { Pressable,
  StyleSheet,
  
  View } from "react-native";
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
  const [isEditingPrice, setIsEditingPrice] = React.useState(false);
  const [priceText, setPriceText] = React.useState(
    String(customPrice ?? Number(venue.pricePerHour))
  );

  const effectivePrice = customPrice ?? Number(venue.pricePerHour);
  const subtotal = effectivePrice * durationHours;

  // Sync priceText when customPrice or venue changes
  React.useEffect(() => {
    if (!isEditingPrice) {
      setPriceText(String(customPrice ?? Number(venue.pricePerHour)));
    }
  }, [customPrice, venue.pricePerHour, isEditingPrice]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (isDisabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  };

  const handlePriceSubmit = () => {
    const parsed = parseInt(priceText, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      onPriceChange(parsed);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      setPriceText(String(effectivePrice));
    }
    setIsEditingPrice(false);
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

        {isSelected ? (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              setIsEditingPrice(true);
            }}
            style={[styles.priceEditRow, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}
          >
            <Feather name="edit-3" size={10} color={colors.primary} style={{ marginRight: 4 }} />
            {isEditingPrice ? (
              <View style={styles.priceInputRow}>
                <Text style={[styles.priceSymbol, { color: colors.primary }]}>₹</Text>
                <TextInput
                  style={[styles.priceInput, { color: colors.primary, borderBottomColor: colors.primary }]}
                  value={priceText}
                  onChangeText={setPriceText}
                  keyboardType="number-pad"
                  autoFocus
                  selectTextOnFocus
                  onBlur={handlePriceSubmit}
                  onSubmitEditing={handlePriceSubmit}
                />
                <Text style={[styles.priceUnit, { color: colors.textMuted }]}>/hr</Text>
              </View>
            ) : (
              <Text style={[styles.priceEditable, { color: colors.primary }]}>
                ₹{effectivePrice.toLocaleString("en-IN")}/hr
              </Text>
            )}
          </Pressable>
        ) : (
          <Text style={[styles.price, { color: colors.textSecondary }]}>
            ₹{Number(venue.pricePerHour).toLocaleString("en-IN")}/hr
          </Text>
        )}

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
    boxShadow: "0px 1px 4px rgba(0, 0, 0, 0.05)",
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
  priceEditRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  priceEditable: {
    fontSize: 12,
    fontWeight: "600" as const,
  },
  priceInputRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  priceSymbol: {
    fontSize: 13,
    fontWeight: "700" as const,
  },
  priceInput: {
    fontSize: 13,
    fontWeight: "700" as const,
    borderBottomWidth: 1.5,
    paddingVertical: 0,
    paddingHorizontal: 2,
    minWidth: 50,
  },
  priceUnit: {
    fontSize: 11,
    marginLeft: 2,
  },
});
