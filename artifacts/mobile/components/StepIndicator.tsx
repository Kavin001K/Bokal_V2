import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

export default function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      {steps.map((step, idx) => {
        const isActive = idx === currentStep;
        const isCompleted = idx < currentStep;

        return (
          <React.Fragment key={idx}>
            <View style={styles.stepItem}>
              <View
                style={[
                  styles.circle,
                  {
                    backgroundColor: isCompleted || isActive
                      ? colors.primary
                      : colors.muted,
                    borderColor: isActive ? colors.primary : "transparent",
                    borderWidth: isActive ? 2 : 0,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.circleText,
                    {
                      color: isCompleted || isActive
                        ? "#fff"
                        : colors.textMuted,
                    },
                  ]}
                >
                  {isCompleted ? "✓" : String(idx + 1)}
                </Text>
              </View>
              <Text
                style={[
                  styles.label,
                  {
                    color: isActive
                      ? colors.primary
                      : isCompleted
                      ? colors.textSecondary
                      : colors.textMuted,
                    fontWeight: isActive ? ("700" as const) : ("400" as const),
                  },
                ]}
                numberOfLines={1}
              >
                {step}
              </Text>
            </View>
            {idx < steps.length - 1 && (
              <View
                style={[
                  styles.line,
                  {
                    backgroundColor: isCompleted ? colors.primary : colors.border,
                  },
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  stepItem: {
    alignItems: "center",
    gap: 4,
    minWidth: 56,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  circleText: {
    fontSize: 12,
    fontWeight: "700" as const,
  },
  label: {
    fontSize: 10,
    textAlign: "center",
  },
  line: {
    flex: 1,
    height: 2,
    marginBottom: 18,
    marginHorizontal: 4,
  },
});
