import { AnimatedButton } from "@/components/AnimatedButton";
import { Text, TextInput } from "@/components/Typography";
import { Feather } from "@expo/vector-icons";
import { useLogin } from "@workspace/api-client-react";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";

const nativeDriver = Platform.OS !== "web";

function TempleIcon({ size = 64 }: { size?: number }) {
  // A custom temple/venue icon built from View components
  const s = size;
  return (
    <View style={{ width: s, height: s, alignItems: "center", justifyContent: "center" }}>
      {/* Dome */}
      <View style={{
        width: s * 0.35,
        height: s * 0.2,
        borderTopLeftRadius: s * 0.2,
        borderTopRightRadius: s * 0.2,
        backgroundColor: "rgba(255,255,255,0.95)",
        marginBottom: -1,
      }} />
      {/* Kalasam (finial) */}
      <View style={{
        position: "absolute",
        top: s * 0.02,
        width: s * 0.08,
        height: s * 0.12,
        backgroundColor: "#FFD700",
        borderRadius: s * 0.04,
      }} />
      {/* Main body */}
      <View style={{
        width: s * 0.55,
        height: s * 0.3,
        backgroundColor: "rgba(255,255,255,0.9)",
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4,
      }} />
      {/* Pillars */}
      <View style={{ flexDirection: "row", gap: s * 0.12, marginTop: -1 }}>
        <View style={{ width: s * 0.07, height: s * 0.22, backgroundColor: "rgba(255,255,255,0.85)", borderRadius: 2 }} />
        <View style={{ width: s * 0.07, height: s * 0.22, backgroundColor: "rgba(255,255,255,0.85)", borderRadius: 2 }} />
        <View style={{ width: s * 0.07, height: s * 0.22, backgroundColor: "rgba(255,255,255,0.85)", borderRadius: 2 }} />
      </View>
      {/* Base */}
      <View style={{
        width: s * 0.65,
        height: s * 0.06,
        backgroundColor: "rgba(255,255,255,0.8)",
        borderRadius: 2,
        marginTop: -1,
      }} />
    </View>
  );
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  // Entrance animations
  const isWeb = Platform.OS === "web";
  const logoAnim = useRef(new Animated.Value(isWeb ? 1 : 0)).current;
  const cardAnim = useRef(new Animated.Value(isWeb ? 1 : 0)).current;
  const cardSlide = useRef(new Animated.Value(isWeb ? 0 : 30)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(logoAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: nativeDriver,
      }),
      Animated.parallel([
        Animated.timing(cardAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: nativeDriver,
        }),
        Animated.spring(cardSlide, {
          toValue: 0,
          tension: 60,
          friction: 12,
          useNativeDriver: nativeDriver,
        }),
      ]),
    ]).start();
  }, []);

  const loginMutation = useLogin({
    mutation: {
      onSuccess: async (data) => {
        await login(data.token, data.user);
        router.replace("/(tabs)");
      },
      onError: (err: any) => {
        const msg = err.message || "";
        const targetUrl = err.url || "unknown URL";
        if (msg.includes("Failed to fetch") || msg.includes("Network request failed")) {
          setError(`Network error: Unable to connect to ${targetUrl}. Check your internet.`);
        } else {
          setError(err?.data?.message || err.message || "An unexpected error occurred");
        }
      },
    },
  });

  const handleLogin = () => {
    setError("");
    if (!email.trim() || !password) {
      setError("Please enter email and password");
      return;
    }
    loginMutation.mutate({ data: { email: email.trim().toLowerCase(), password } });
  };

  return (
    <LinearGradient
      colors={["#FDF8F3", "#F5E6D8", "#EDD5C2"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.3, y: 1 }}
      style={styles.container}
    >
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.kav}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.logoArea, { opacity: logoAnim, transform: [{ scale: logoAnim }] }]}>
            <LinearGradient
              colors={["#C75B2A", "#A04520"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoCircle}
            >
              <TempleIcon size={52} />
            </LinearGradient>
            <Text style={styles.appName}>Bookal</Text>
            <Text style={styles.tagline}>Venue Booking Made Simple</Text>
            <Text style={styles.taglineTamil}>இடம் பதிவு எளிமையாக</Text>
          </Animated.View>

          <Animated.View style={[styles.card, { opacity: cardAnim, transform: [{ translateY: cardSlide }] }]}>
            <Text style={styles.welcomeText}>Welcome back</Text>
            <Text style={styles.subText}>Sign in to continue</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={[styles.inputRow, error ? styles.inputRowError : null]}>
                <Feather name="mail" size={16} color="#A89080" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#A89080"
                  value={email}
                  onChangeText={(t) => { setEmail(t); setError(""); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.inputRow, error ? styles.inputRowError : null]}>
                <Feather name="lock" size={16} color="#A89080" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.inputFlex]}
                  placeholder="••••••••"
                  placeholderTextColor="#A89080"
                  value={password}
                  onChangeText={(t) => { setPassword(t); setError(""); }}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <Pressable
                  onPress={() => setShowPassword((v) => !v)}
                  style={styles.eyeBtn}
                  hitSlop={8}
                >
                  <Feather
                    name={showPassword ? "eye-off" : "eye"}
                    size={16}
                    color="#A89080"
                  />
                </Pressable>
              </View>
            </View>

            {error ? (
              <Animated.View style={styles.errorBox}>
                <Feather name="alert-circle" size={14} color="#E63946" />
                <Text style={styles.errorText}>{error}</Text>
              </Animated.View>
            ) : null}

            <AnimatedButton
            style={styles.loginBtn}
            onPress={handleLogin}
            disabled={loginMutation.isPending}
            scaleTo={0.96}
          >
            <LinearGradient
              colors={loginMutation.isPending ? ["#A89080", "#A89080"] : ["#C75B2A", "#A64920"]}
              style={styles.loginGradient}
            >
              {loginMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.loginBtnContent}>
                  <Feather name="log-in" size={18} color="#fff" />
                  <Text style={styles.loginBtnText}>Sign In</Text>
                </View>
              )}
            </LinearGradient>
          </AnimatedButton>
          </Animated.View>

          <Text style={styles.version}>Bookal v1.0</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  kav: { flex: 1 },
  scroll: { alignItems: "center", paddingHorizontal: 24 },
  logoArea: { alignItems: "center", marginBottom: 32 },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    boxShadow: '0px 10px 20px rgba(199, 91, 42, 0.35)',
    elevation: 10,
  },
  appName: {
    fontSize: 38,
    fontWeight: "800" as const,
    color: "#1A1209",
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: "#6B5744",
    marginTop: 4,
    fontWeight: "500" as const,
  },
  taglineTamil: {
    fontSize: 13,
    color: "#A89080",
    marginTop: 2,
  },
  card: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 28,
    boxShadow: '0px 8px 24px rgba(199, 91, 42, 0.12)',
    elevation: 8,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "800" as const,
    color: "#1A1209",
    marginBottom: 4,
  },
  subText: {
    fontSize: 14,
    color: "#A89080",
    marginBottom: 28,
  },
  fieldGroup: { marginBottom: 18 },
  label: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#6B5744",
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FDF8F3",
    borderWidth: 1.5,
    borderColor: "#E8DDD4",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 54,
  },
  inputRowError: {
    borderColor: "#E63946",
    backgroundColor: "#FFF8F8",
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#1A1209",
  },
  inputFlex: { flex: 1 },
  eyeBtn: { padding: 4 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFE8EA",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: "#E63946",
    flex: 1,
  },
  loginBtn: {
    marginTop: 8,
    borderRadius: 16,
    overflow: "hidden",
    boxShadow: '0px 8px 16px rgba(199, 91, 42, 0.35)',
    elevation: 8,
  },
  loginGradient: {
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  loginBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loginBtnText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#fff",
    letterSpacing: 0.3,
  },
  hintBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 18,
    justifyContent: "center",
  },
  hintText: {
    fontSize: 11,
    color: "#A89080",
  },
  version: {
    marginTop: 28,
    fontSize: 12,
    color: "#A89080",
    fontWeight: "500" as const,
  },
});
