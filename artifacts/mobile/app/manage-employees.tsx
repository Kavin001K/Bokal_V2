import { AnimatedButton } from "@/components/AnimatedButton";
import { Text, TextInput } from "@/components/Typography";
import { Feather } from "@expo/vector-icons";
import {
  useCreateUser,
  useGetUsers,
  useUpdateUser,
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
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

export default function ManageEmployeesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [showAddUser, setShowAddUser] = useState(false);

  const { data: users, refetch: refetchUsers } = useGetUsers({
    query: { queryKey: ["users"] },
  });

  const updateUserMutation = useUpdateUser({
    mutation: {
      onSuccess: () => {
        refetchUsers();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    },
  });

  if (user?.role !== "admin") {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <Feather name="lock" size={40} color={colors.border} />
        <Text style={[styles.noAccessTitle, { color: colors.textSecondary }]}>Admin Only</Text>
      </View>
    );
  }

  const employees = (users ?? []).filter((u) => u.role === "employee");
  const admins = (users ?? []).filter((u) => u.role === "admin");

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Feather name="arrow-left" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Team Members</Text>
        <Pressable onPress={() => setShowAddUser(true)} hitSlop={8}>
          <View style={[styles.addIconBtn, { backgroundColor: colors.primary }]}>
            <Feather name="user-plus" size={16} color="#fff" />
          </View>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats bar */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>{(users ?? []).length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.success + "12", borderColor: colors.success + "30" }]}>
            <Text style={[styles.statNumber, { color: colors.success }]}>{(users ?? []).filter((u) => u.isActive).length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Active</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.warning + "12", borderColor: colors.warning + "30" }]}>
            <Text style={[styles.statNumber, { color: colors.warning }]}>{admins.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Admins</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.textMuted + "12", borderColor: colors.textMuted + "30" }]}>
            <Text style={[styles.statNumber, { color: colors.textSecondary }]}>{employees.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Employees</Text>
          </View>
        </View>

        {/* Admin section */}
        {admins.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Feather name="shield" size={14} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Administrators</Text>
            </View>
            {admins.map((u) => (
              <UserCard key={u.id} user={u} colors={colors} updateUserMutation={updateUserMutation} />
            ))}
          </>
        )}

        {/* Employee section */}
        <View style={styles.sectionHeader}>
          <Feather name="users" size={14} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Employees</Text>
        </View>
        {employees.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="user-plus" size={32} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No employees yet</Text>
            <AnimatedButton
              style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowAddUser(true)}
            >
              <Feather name="plus" size={14} color="#fff" />
              <Text style={styles.emptyBtnText}>Add First Employee</Text>
            </AnimatedButton>
          </View>
        ) : (
          employees.map((u) => (
            <UserCard key={u.id} user={u} colors={colors} updateUserMutation={updateUserMutation} />
          ))
        )}
      </ScrollView>

      <AddUserModal
        visible={showAddUser}
        onClose={() => setShowAddUser(false)}
        onCreated={() => {
          setShowAddUser(false);
          refetchUsers();
        }}
        colors={colors}
      />
    </View>
  );
}

function UserCard({
  user: u,
  colors,
  updateUserMutation,
}: {
  user: any;
  colors: ReturnType<typeof useColors>;
  updateUserMutation: any;
}) {
  return (
    <View style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.userRow}>
        <View style={[styles.userAvatar, { backgroundColor: u.role === "admin" ? colors.primary : colors.textSecondary }]}>
          <Text style={styles.avatarText}>{u.fullName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.userName, { color: colors.textPrimary }]}>{u.fullName}</Text>
            <View style={[styles.roleBadge, { backgroundColor: u.role === "admin" ? colors.primary + "20" : colors.secondary }]}>
              <Text style={[styles.roleText, { color: u.role === "admin" ? colors.primary : colors.textSecondary }]}>
                {u.role}
              </Text>
            </View>
          </View>
          <Text style={[styles.userEmail, { color: colors.textMuted }]}>{u.email}</Text>
          {u.lastLogin && (
            <Text style={[styles.lastLogin, { color: colors.textMuted }]}>
              Last login: {new Date(u.lastLogin).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </Text>
          )}
        </View>
        <View style={styles.switchCol}>
          <Switch
            value={u.isActive}
            onValueChange={(val) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              updateUserMutation.mutate({ id: u.id, data: { isActive: val } });
            }}
            trackColor={{ false: colors.border, true: colors.primary + "60" }}
            thumbColor={u.isActive ? colors.primary : colors.textMuted}
          />
          <Text style={[styles.switchLabel, { color: u.isActive ? colors.success : colors.textMuted }]}>
            {u.isActive ? "Active" : "Inactive"}
          </Text>
        </View>
      </View>
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
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "employee" as "admin" | "employee",
  });
  const [error, setError] = useState("");

  const createMutation = useCreateUser({
    mutation: {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onCreated();
        setForm({ fullName: "", email: "", password: "", role: "employee" });
        setError("");
      },
      onError: (err: { data?: { error?: string } }) =>
        setError(err?.data?.error ?? "Failed to create user"),
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
          {error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.destructive + "15" }]}>
              <Feather name="alert-circle" size={14} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            </View>
          ) : null}

          {[
            { label: "Full Name", key: "fullName", placeholder: "John Doe", keyboard: "default" as const },
            { label: "Email", key: "email", placeholder: "john@example.com", keyboard: "email-address" as const },
            { label: "Password", key: "password", placeholder: "Min 6 characters", keyboard: "default" as const, secure: true },
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
                <AnimatedButton
                  key={r}
                  style={[
                    styles.roleBtn,
                    {
                      backgroundColor: form.role === r ? colors.primary : colors.card,
                      borderColor: form.role === r ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setForm((f) => ({ ...f, role: r }))}
                  scaleTo={0.97}
                >
                  <Text style={[styles.roleBtnText, { color: form.role === r ? "#fff" : colors.textSecondary }]}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </Text>
                </AnimatedButton>
              ))}
            </View>
          </View>

          <AnimatedButton
            style={[styles.createBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              setError("");
              if (!form.fullName || !form.email || !form.password) {
                setError("All fields are required");
                return;
              }
              if (form.password.length < 6) {
                setError("Password must be at least 6 characters");
                return;
              }
              createMutation.mutate({ data: form });
            }}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="user-plus" size={16} color="#fff" />
                <Text style={styles.createBtnText}>Create Employee</Text>
              </>
            )}
          </AnimatedButton>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center", gap: 12 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 18, fontWeight: "700" as const },
  addIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flex: 1 },

  statsRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  statNumber: { fontSize: 20, fontWeight: "800" as const },
  statLabel: { fontSize: 10, fontWeight: "600" as const, marginTop: 2 },

  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10, marginTop: 8 },
  sectionTitle: { fontSize: 14, fontWeight: "700" as const },

  userCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  userRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  userAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "700" as const },
  userInfo: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  userName: { fontSize: 15, fontWeight: "700" as const },
  userEmail: { fontSize: 12, marginBottom: 2 },
  lastLogin: { fontSize: 10 },
  roleBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  roleText: { fontSize: 10, fontWeight: "700" as const, textTransform: "uppercase" },
  switchCol: { alignItems: "center", gap: 2 },
  switchLabel: { fontSize: 9, fontWeight: "600" as const },

  emptyCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 32,
    alignItems: "center",
    gap: 12,
  },
  emptyText: { fontSize: 14 },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" as const },

  noAccessTitle: { fontSize: 18, fontWeight: "700" as const },

  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: { fontSize: 18, fontWeight: "700" as const },
  modalScroll: { padding: 20 },
  modalField: { marginBottom: 16 },
  modalLabel: { fontSize: 13, fontWeight: "600" as const, marginBottom: 8 },
  modalInput: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, height: 50, fontSize: 15 },
  roleToggle: { flexDirection: "row", gap: 10 },
  roleBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, alignItems: "center" },
  roleBtnText: { fontSize: 14, fontWeight: "600" as const },
  createBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    flexDirection: "row",
    gap: 8,
  },
  createBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" as const },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: { fontSize: 13, flex: 1 },
});
