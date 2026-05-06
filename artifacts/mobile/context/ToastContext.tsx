import React, { createContext, useContext, useState, useCallback } from "react";
import { StyleSheet, Animated, Text, View, Dimensions } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useEffect, useRef } from "react";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastType, keyof typeof Feather.glyphMap> = {
  success: "check-circle",
  error: "alert-circle",
  info: "info",
};

const COLORS: Record<ToastType, string> = {
  success: "#10B981",
  error: "#EF4444",
  info: "#3B82F6",
};

const BG: Record<ToastType, string> = {
  success: "#ECFDF5",
  error: "#FEF2F2",
  info: "#EFF6FF",
};

let nextId = 0;

function ToastItemView({ item, onDone }: { item: ToastItem; onDone: () => void }) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 15 }),
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -100, duration: 200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => onDone());
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      style={[styles.toast, { backgroundColor: BG[item.type], borderColor: COLORS[item.type], opacity, transform: [{ translateY }] }]}
    >
      <Feather name={ICONS[item.type]} size={18} color={COLORS[item.type]} />
      <Text style={[styles.toastText, { color: COLORS[item.type] }]} numberOfLines={2}>
        {item.message}
      </Text>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string) => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, type, message }]);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View style={styles.container} pointerEvents="box-none">
        {toasts.map((item) => (
          <ToastItemView key={item.id} item={item} onDone={() => removeToast(item.id)} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 9999,
    elevation: 9999,
    pointerEvents: "box-none",
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    width: width - 40,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  toastText: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
});
