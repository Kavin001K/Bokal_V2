import * as Haptics from "expo-haptics";
import React from "react";
import { Pressable, PressableProps, StyleProp, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface AnimatedButtonProps extends PressableProps {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  hapticStyle?: Haptics.ImpactFeedbackStyle;
  children: React.ReactNode;
}

export function AnimatedButton({ 
  style, 
  scaleTo = 0.96, 
  hapticStyle = Haptics.ImpactFeedbackStyle.Light,
  children, 
  onPressIn, 
  onPressOut, 
  onPress,
  ...props 
}: AnimatedButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <AnimatedPressable
      style={[style, animatedStyle]}
      onPressIn={(e) => {
        scale.value = withSpring(scaleTo, { damping: 15, stiffness: 300 });
        if (onPressIn) onPressIn(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
        if (onPressOut) onPressOut(e);
      }}
      onPress={(e) => {
        Haptics.impactAsync(hapticStyle);
        if (onPress) onPress(e);
      }}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}
