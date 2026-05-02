import React from "react";
import {
  Text as RNText,
  TextProps as RNTextProps,
  TextInput as RNTextInput,
  TextInputProps as RNTextInputProps,
  StyleSheet,
} from "react-native";

export interface TextProps extends RNTextProps {
  weight?: "400" | "500" | "600" | "700";
}

export function Text({ style, weight, ...props }: TextProps) {
  let fontFamily = "Inter_400Regular";

  // If weight is passed directly, use it. Otherwise, try to extract fontWeight from style
  let finalWeight = weight;
  if (!finalWeight && style) {
    const flatStyle = StyleSheet.flatten(style);
    if (flatStyle?.fontWeight) {
      const fw = String(flatStyle.fontWeight);
      if (fw === "bold" || fw === "700" || fw === "800" || fw === "900") {
        finalWeight = "700";
      } else if (fw === "600") {
        finalWeight = "600";
      } else if (fw === "500") {
        finalWeight = "500";
      } else if (fw === "400" || fw === "normal") {
        finalWeight = "400";
      }
    }
  }

  if (finalWeight === "700") fontFamily = "Inter_700Bold";
  else if (finalWeight === "600") fontFamily = "Inter_600SemiBold";
  else if (finalWeight === "500") fontFamily = "Inter_500Medium";

  return <RNText {...props} style={[style, { fontFamily }]} />;
}

export function TextInput({ style, ...props }: RNTextInputProps) {
  let fontFamily = "Inter_400Regular";

  if (style) {
    const flatStyle = StyleSheet.flatten(style);
    if (flatStyle?.fontWeight) {
      const fw = String(flatStyle.fontWeight);
      if (fw === "bold" || fw === "700" || fw === "800" || fw === "900") {
        fontFamily = "Inter_700Bold";
      } else if (fw === "600") {
        fontFamily = "Inter_600SemiBold";
      } else if (fw === "500") {
        fontFamily = "Inter_500Medium";
      }
    }
  }

  return <RNTextInput {...props} style={[style, { fontFamily }]} />;
}
