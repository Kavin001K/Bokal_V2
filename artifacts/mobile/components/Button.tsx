import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { AnimatedButton, type AnimatedButtonProps } from "@/components/AnimatedButton";
import { Text } from "@/components/Typography";
import { useColors } from "@/hooks/useColors";

export type ButtonVariant = "primary" | "secondary" | "destructive" | "ghost";

interface ButtonProps extends Omit<AnimatedButtonProps, "children"> {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: keyof typeof Feather.glyphMap;
}

export function Button({
  label,
  variant = "primary",
  loading = false,
  icon,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const colors = useColors();
  const isDisabled = disabled || loading;

  const variantStyles = {
    primary: {
      container: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
      },
      textColor: "#FFFFFF",
    },
    secondary: {
      container: {
        backgroundColor: colors.card,
        borderColor: colors.primary,
      },
      textColor: colors.primary,
    },
    destructive: {
      container: {
        backgroundColor: colors.destructive,
        borderColor: colors.destructive,
      },
      textColor: "#FFFFFF",
    },
    ghost: {
      container: {
        backgroundColor: "transparent",
        borderColor: "transparent",
      },
      textColor: colors.textSecondary,
    },
  } as const;

  const config = variantStyles[variant];

  return (
    <AnimatedButton
      style={[
        styles.button,
        config.container,
        isDisabled && styles.disabled,
        style,
      ]}
      disabled={isDisabled}
      {...props}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={config.textColor} />
        ) : (
          <>
            {icon ? <Feather name={icon} size={16} color={config.textColor} /> : null}
            <Text style={[styles.label, { color: config.textColor }]}>{label}</Text>
          </>
        )}
      </View>
    </AnimatedButton>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  disabled: {
    opacity: 0.6,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: "700" as const,
  },
});
