import { Feather } from "@expo/vector-icons";
import { useLogin } from "@workspace/api-client-react";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const loginMutation = useLogin({
    mutation: {
      onSuccess: async (data) => {
        await login(data.token, data.user);
        router.replace("/(tabs)");
      },
      onError: (err: { data?: { message?: string } }) => {
        setError(err?.data?.message ?? "Invalid email or password");
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
      colors={["#FDF8F3", "#F5E6D8"]}
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
          <View style={styles.logoArea}>
            <View style={styles.logoCircle}>
              <Feather name="bookmark" size={36} color="#FFFFFF" />
            </View>
            <Text style={styles.appName}>Bookal</Text>
            <Text style={styles.tagline}>Venue Booking Made Simple</Text>
            <Text style={styles.taglineTamil}>இடம் பதிவு எளிமையாக</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.welcomeText}>Welcome back</Text>
            <Text style={styles.subText}>Sign in to continue</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputRow}>
                <Feather name="mail" size={16} color="#A89080" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="admin@bookal.app"
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
              <View style={styles.inputRow}>
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
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={14} color="#E63946" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                styles.loginBtn,
                { opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={handleLogin}
              disabled={loginMutation.isPending}
            >
              <LinearGradient
                colors={["#C75B2A", "#E07340"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loginGradient}
              >
                {loginMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loginBtnText}>Sign In</Text>
                )}
              </LinearGradient>
            </Pressable>

            <View style={styles.hintBox}>
              <Feather name="info" size={12} color="#A89080" />
              <Text style={styles.hintText}>Default: admin@bookal.app / Admin@123</Text>
            </View>
          </View>

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
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "#C75B2A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    shadowColor: "#C75B2A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  appName: {
    fontSize: 36,
    fontWeight: "800" as const,
    color: "#1A1209",
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: "#6B5744",
    marginTop: 4,
  },
  taglineTamil: {
    fontSize: 13,
    color: "#A89080",
    marginTop: 2,
  },
  card: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#C75B2A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: "#1A1209",
    marginBottom: 4,
  },
  subText: {
    fontSize: 14,
    color: "#A89080",
    marginBottom: 24,
  },
  fieldGroup: { marginBottom: 16 },
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
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
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
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: "#E63946",
    flex: 1,
  },
  loginBtn: {
    marginTop: 8,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#C75B2A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  loginGradient: {
    height: 54,
    alignItems: "center",
    justifyContent: "center",
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
    marginTop: 16,
    justifyContent: "center",
  },
  hintText: {
    fontSize: 11,
    color: "#A89080",
  },
  version: {
    marginTop: 24,
    fontSize: 12,
    color: "#A89080",
  },
});
