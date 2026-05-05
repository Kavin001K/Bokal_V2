import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

export default function TabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const { user } = useAuth();
  const { t } = useLanguage();
  const isAdmin = user?.role === "admin";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.card,
          borderTopWidth: isIOS ? 0 : StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          elevation: 20,
          height: isWeb ? 84 : 72,
          paddingBottom: isIOS ? 20 : 12,
          boxShadow: '0px -10px 20px rgba(0, 0, 0, 0.1)',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "700" as const,
          marginTop: -4,
          letterSpacing: 0.2,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={95}
              tint={isDark ? "dark" : "light"}
              style={[
                StyleSheet.absoluteFill,
                { borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden" },
              ]}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
              ]}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("home"),
          tabBarIcon: ({ color }) => <Feather name="home" size={21} color={color} />,
        }}
      />
      <Tabs.Screen
        name="new-booking"
        options={{
          title: t("new"),
          tabBarIcon: ({ color }) => <Feather name="plus-circle" size={21} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: t("reports"),
          tabBarIcon: ({ color }) => <Feather name="bar-chart-2" size={21} color={color} />,
          tabBarItemStyle: !isAdmin ? { display: "none" } : undefined,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t("settings"),
          tabBarIcon: ({ color }) => <Feather name="settings" size={21} color={color} />,
          tabBarItemStyle: !isAdmin ? { display: "none" } : undefined,
        }}
      />
      <Tabs.Screen
        name="manage-venues"
        options={{
          href: null, // Hidden from tab bar
        }}
      />
    </Tabs>
  );
}
