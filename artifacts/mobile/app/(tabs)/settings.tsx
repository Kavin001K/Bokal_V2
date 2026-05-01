import { Feather } from "@expo/vector-icons";
import {
  useCreateUser,
  useGetSettings,
  useGetUsers,
  useGetVenues,
  useUpdateSettings,
  useUpdateUser,
  useUpdateVenuePrice,
} from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [showAddUser, setShowAddUser] = useState(false);

  const { data: venues, refetch: refetchVenues } = useGetVenues({ query: { queryKey: ["venues"] } });
  const { data: settings } = useGetSettings({ query: { queryKey: ["settings"] } });
  const { data: users, refetch: refetchUsers } = useGetUsers({ query: { queryKey: ["users"] } });

  const updateVenueMutation = useUpdateVenuePrice({
    mutation: {
      onSuccess: () => { refetchVenues(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); },
    },
  });

  const updateUserMutation = useUpdateUser({
    mutation: { onSuccess: () => refetchUsers() },
  });

  const [localPrices, setLocalPrices] = useState<Record<string, string>>({});

  if (user?.role !== "admin") {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <Feather name="lock" size={40} color={colors.border} />
        <Text style={[styles.noAccessTitle, { color: colors.textSecondary }]}>Admin Only</Text>
        <Text style={[styles.noAccessText, { color: colors.textMuted }]}>Settings are only accessible to admins</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Settings</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader title="Venue Pricing" icon="dollar-sign" colors={colors} />
        {(venues ?? []).map((venue) => {
          const priceStr = localPrices[venue.id] ?? String(venue.pricePerHour);
          return (
            <View key={venue.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.venueIcon, { backgroundColor: colors.secondary }]}>
                  <Feather name={venue.type === "mahal" ? "home" : "wind"} size={16} color={colors.primary} />
                </View>
                <Text style={[styles.venueName, { color: colors.textPrimary }]}>{venue.name}</Text>
              </View>
              <Text style={[styles.priceLabel, { color: colors.textMuted }]}>Price per hour</Text>
              <View style={styles.priceRow}>
                <View style={[styles.prefixBox, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.prefix, { color: colors.textSecondary }]}>₹</Text>
                </View>
                <TextInput
                  style={[styles.priceInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                  value={priceStr}
                  onChangeText={(t) => setLocalPrices((p) => ({ ...p, [venue.id]: t }))}
                  keyboardType="number-pad"
                />
                <Pressable
                  style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    const price = parseFloat(priceStr);
                    if (!isNaN(price) && price > 0) {
                      updateVenueMutation.mutate({ id: venue.id, data: { pricePerHour: price } });
                    }
                  }}
                >
                  {updateVenueMutation.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save</Text>
                  )}
                </Pressable>
              </View>
            </View>
          );
        })}

        <SectionHeader title="Team Members" icon="users" colors={colors} />
        <Pressable
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => setShowAddUser(true)}
        >
          <Feather name="user-plus" size={16} color="#fff" />
          <Text style={styles.addBtnText}>Add Employee</Text>
        </Pressable>

        {(users ?? []).map((u) => (
          <View key={u.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.userRow}>
              <View style={[styles.userAvatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarText}>{u.fullName.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: colors.textPrimary }]}>{u.fullName}</Text>
                <Text style={[styles.userEmail, { color: colors.textMuted }]}>{u.email}</Text>
                <View style={[styles.roleBadge, { backgroundColor: u.role === "admin" ? colors.primary + "20" : colors.secondary }]}>
                  <Text style={[styles.roleText, { color: u.role === "admin" ? colors.primary : colors.textSecondary }]}>
                    {u.role}
                  </Text>
                </View>
              </View>
              <Switch
                value={u.isActive}
                onValueChange={(val) => {
                  updateUserMutation.mutate({ id: u.id, data: { isActive: val } });
                }}
                trackColor={{ false: colors.border, true: colors.primary + "60" }}
                thumbColor={u.isActive ? colors.primary : colors.textMuted}
              />
            </View>
          </View>
        ))}

        <SectionHeader title="Account" icon="user" colors={colors} />
        <Pressable
          style={[styles.card, styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push("/change-password")}
        >
          <Feather name="key" size={18} color={colors.textSecondary} />
          <Text style={[styles.menuCardText, { color: colors.textPrimary }]}>Change Password</Text>
          <Feather name="chevron-right" size={16} color={colors.textMuted} />
        </Pressable>
        <Pressable
          style={[styles.card, styles.menuCard, { backgroundColor: colors.card, borderColor: colors.destructive + "40" }]}
          onPress={() => {
            Alert.alert("Logout", "Are you sure you want to logout?", [
              { text: "Cancel", style: "cancel" },
              { text: "Logout", style: "destructive", onPress: async () => { await logout(); router.replace("/login"); } },
            ]);
          }}
        >
          <Feather name="log-out" size={18} color={colors.destructive} />
          <Text style={[styles.menuCardText, { color: colors.destructive }]}>Logout</Text>
          <Feather name="chevron-right" size={16} color={colors.destructive} />
        </Pressable>
      </ScrollView>

      <AddUserModal
        visible={showAddUser}
        onClose={() => setShowAddUser(false)}
        onCreated={() => { setShowAddUser(false); refetchUsers(); }}
        colors={colors}
      />
    </View>
  );
}

function AddUserModal({
  visible,
  onClose,
  onCreated,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const [form, setForm] = useState({ fullName: "", email: "", password: "", role: "employee" as "admin" | "employee" });
  const [error, setError] = useState("");

  const createMutation = useCreateUser({
    mutation: {
      onSuccess: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); onCreated(); setForm({ fullName: "", email: "", password: "", role: "employee" }); },
      onError: (err: { data?: { error?: string } }) => setError(err?.data?.error ?? "Failed to create user"),
    },
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Add Employee</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Feather name="x" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>
        <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
          {error ? <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text> : null}
          {[
            { label: "Full Name", key: "fullName", placeholder: "John Doe", keyboard: "default" as const },
            { label: "Email", key: "email", placeholder: "john@example.com", keyboard: "email-address" as const },
            { label: "Password", key: "password", placeholder: "Min 6 chars", keyboard: "default" as const, secure: true },
          ].map((field) => (
            <View key={field.key} style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{field.label}</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }]}
                placeholder={field.placeholder}
                placeholderTextColor={colors.textMuted}
                value={(form as Record<string, string>)[field.key]}
                onChangeText={(t) => setForm((f) => ({ ...f, [field.key]: t }))}
                keyboardType={field.keyboard}
                secureTextEntry={field.secure}
                autoCapitalize="none"
              />
            </View>
          ))}
          <View style={styles.modalField}>
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Role</Text>
            <View style={styles.roleToggle}>
              {(["employee", "admin"] as const).map((r) => (
                <Pressable
                  key={r}
                  style={[styles.roleBtn, { backgroundColor: form.role === r ? colors.primary : colors.card, borderColor: form.role === r ? colors.primary : colors.border }]}
                  onPress={() => setForm((f) => ({ ...f, role: r }))}
                >
                  <Text style={[styles.roleBtnText, { color: form.role === r ? "#fff" : colors.textSecondary }]}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <Pressable
            style={[styles.createBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              if (!form.fullName || !form.email || !form.password) { setError("All fields required"); return; }
              createMutation.mutate({ data: form });
            }}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.createBtnText}>Create Employee</Text>}
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

function SectionHeader({ title, icon, colors }: { title: string; icon: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.sectionHeader}>
      <Feather name={icon as "home"} size={15} color={colors.primary} />
      <Text style={[styles.sectionHeaderText, { color: colors.textPrimary }]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center", gap: 12 },
  header: { paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontSize: 22, fontWeight: "800" as const },
  scroll: { flex: 1 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10, marginTop: 16 },
  sectionHeaderText: { fontSize: 14, fontWeight: "700" as const },
  card: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 10 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  venueIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  venueName: { fontSize: 15, fontWeight: "700" as const },
  priceLabel: { fontSize: 12, marginBottom: 8 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  prefixBox: { height: 44, paddingHorizontal: 12, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  prefix: { fontSize: 16, fontWeight: "700" as const },
  priceInput: { flex: 1, height: 44, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, fontSize: 15 },
  saveBtn: { height: 44, paddingHorizontal: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  saveBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" as const },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center", padding: 14, borderRadius: 12, marginBottom: 10 },
  addBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" as const },
  userRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  userAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 16, fontWeight: "700" as const },
  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontWeight: "700" as const },
  userEmail: { fontSize: 12, marginTop: 1 },
  roleBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  roleText: { fontSize: 11, fontWeight: "600" as const, textTransform: "capitalize" },
  menuCard: { flexDirection: "row", alignItems: "center", gap: 12 },
  menuCardText: { flex: 1, fontSize: 14, fontWeight: "500" as const },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: StyleSheet.hairlineWidth },
  modalTitle: { fontSize: 18, fontWeight: "700" as const },
  modalScroll: { padding: 20 },
  modalField: { marginBottom: 16 },
  modalLabel: { fontSize: 13, fontWeight: "600" as const, marginBottom: 8 },
  modalInput: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, height: 50, fontSize: 15 },
  roleToggle: { flexDirection: "row", gap: 10 },
  roleBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, alignItems: "center" },
  roleBtnText: { fontSize: 14, fontWeight: "600" as const },
  createBtn: { height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 8 },
  createBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" as const },
  errorText: { marginBottom: 12, fontSize: 13 },
  noAccessTitle: { fontSize: 18, fontWeight: "700" as const },
  noAccessText: { fontSize: 14, textAlign: "center" },
});
