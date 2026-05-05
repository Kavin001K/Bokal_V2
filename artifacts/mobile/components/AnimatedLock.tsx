import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";

export function AnimatedLock({ size = 64, color = "#FFFFFF" }: { size?: number; color?: string }) {
  const pulse = useSharedValue(1);
  const rotation = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    rotation.value = withRepeat(
      withSequence(
        withDelay(1000, withTiming(-10, { duration: 100 })),
        withTiming(10, { duration: 100 }),
        withTiming(-10, { duration: 100 }),
        withTiming(0, { duration: 100 }),
        withDelay(2000, withTiming(0, { duration: 0 })) // pause
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulse.value }, { rotateZ: `${rotation.value}deg` }],
    };
  });

  return (
    <Animated.View style={[styles.container, { width: size, height: size }, animatedStyle]}>
      <View style={[styles.circle, { borderColor: color }]} />
      <Feather name="lock" size={size * 0.5} color={color} style={styles.icon} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  circle: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    borderWidth: 2,
    opacity: 0.3,
  },
  icon: {
    position: "absolute",
  },
});
