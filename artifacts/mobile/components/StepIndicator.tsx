import { Text, TextInput } from "@/components/Typography";
import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet,  View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  steps: string[];
  currentStep: number;
}

export default function StepIndicator({ steps, currentStep }: Props) {
  const colors = useColors();
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(progressAnim, {
      toValue: currentStep,
      tension: 80,
      friction: 14,
      useNativeDriver: false,
    }).start();
  }, [currentStep]);

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      <View style={styles.stepsRow}>
        {steps.map((label, idx) => {
          const isCompleted = idx < currentStep;
          const isActive = idx === currentStep;
          const isLast = idx === steps.length - 1;

          return (
            <View key={idx} style={styles.stepWrapper}>
              <View style={styles.stepItemRow}>
                {/* Circle */}
                <View
                  style={[
                    styles.circle,
                    {
                      backgroundColor: isCompleted
                        ? colors.success
                        : isActive
                        ? colors.primary
                        : colors.secondary,
                      borderColor: isCompleted
                        ? colors.success
                        : isActive
                        ? colors.primary
                        : colors.border,
                    },
                  ]}
                >
                  {isCompleted ? (
                    <Feather name="check" size={12} color="#fff" />
                  ) : (
                    <Text
                      style={[
                        styles.circleText,
                        { color: isActive ? "#fff" : colors.textMuted },
                      ]}
                    >
                      {idx + 1}
                    </Text>
                  )}
                </View>

                {/* Connecting line */}
                {!isLast && (
                  <View
                    style={[
                      styles.connector,
                      {
                        backgroundColor: isCompleted ? colors.success : colors.border,
                      },
                    ]}
                  />
                )}
              </View>

              {/* Label */}
              <Text
                style={[
                  styles.label,
                  {
                    color: isActive
                      ? colors.primary
                      : isCompleted
                      ? colors.success
                      : colors.textMuted,
                    fontWeight: isActive ? ("700" as const) : ("500" as const),
                  },
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stepsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  stepWrapper: {
    flex: 1,
    alignItems: "center",
  },
  stepItemRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    justifyContent: "center",
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  circleText: {
    fontSize: 12,
    fontWeight: "700" as const,
  },
  connector: {
    position: "absolute",
    left: "55%",
    right: "-45%",
    height: 2,
    top: 13,
    zIndex: 0,
  },
  label: {
    fontSize: 10,
    marginTop: 6,
    textAlign: "center",
    letterSpacing: 0.2,
  },
});
