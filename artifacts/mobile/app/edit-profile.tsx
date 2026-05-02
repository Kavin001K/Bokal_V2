import { AnimatedButton } from "@/components/AnimatedButton"; // Refreshed
import { Text, TextInput } from "@/components/Typography";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { AppAlertModal } from "@/components/AppAlertModal";

export default function EditProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, token, updateUser } = useAuth();
  
  const [form, setForm] = useState({
    fullName: user?.fullName || "",
    phoneNumber: user?.phoneNumber?.replace("+91", "") || "",
    dateOfBirth: user?.dateOfBirth || "",
  });

  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [alert, setAlert] = useState<{ visible: boolean; type: 'success' | 'error'; title: string; message: string }>({
    visible: false,
    type: 'success',
    title: '',
    message: '',
  });

  const [tempDate, setTempDate] = useState({
    day: form.dateOfBirth ? form.dateOfBirth.split('-')[2] : "01",
    month: form.dateOfBirth ? form.dateOfBirth.split('-')[1] : "01",
    year: form.dateOfBirth ? form.dateOfBirth.split('-')[0] : "2000",
  });

  const getBaseUrl = () => {
    const domain = process.env["EXPO_PUBLIC_DOMAIN"];
    const isLocal = domain?.includes("localhost") || domain?.includes("127.0.0.1") || domain?.includes("192.168.") || domain?.includes("10.0.");
    return domain ? `${isLocal ? "http" : "https"}://${domain}` : "http://localhost:3001";
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const res = await fetch(`${getBaseUrl()}/api/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          phoneNumber: form.phoneNumber.startsWith("+91") ? form.phoneNumber : `+91${form.phoneNumber}`
        }),
      });

      const responseText = await res.text();
      
      if (!res.ok) {
        try {
          const errorData = JSON.parse(responseText);
          throw new Error(errorData.message || "Update failed");
        } catch {
          throw new Error("Server error. Please ensure your backend is running.");
        }
      }

      const data = JSON.parse(responseText);
      if (updateUser) updateUser(data.user);

      setAlert({ 
        visible: true, 
        type: 'success', 
        title: 'Profile Updated', 
        message: 'Your personal information has been saved successfully.' 
      });
    } catch (err: any) {
      setAlert({ 
        visible: true, 
        type: 'error', 
        title: 'Update Failed', 
        message: err.message || 'Something went wrong' 
      });
    } finally {
      setLoading(false);
    }
  };

  const confirmDate = () => {
    const d = `${tempDate.year}-${tempDate.month.padStart(2, '0')}-${tempDate.day.padStart(2, '0')}`;
    setForm({ ...form, dateOfBirth: d });
    setShowDatePicker(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "Select Date";
    const [y, m, d] = dateStr.split('-');
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${d} ${months[parseInt(m)-1]} ${y}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={15}>
          <Feather name="arrow-left" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Full Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }]}
            value={form.fullName}
            onChangeText={(t) => setForm({ ...form, fullName: t })}
            placeholder="Your Name"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Phone Number</Text>
          <View style={[styles.input, styles.phoneInputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.countryCode, { color: colors.textPrimary }]}>+91</Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <TextInput
              style={[styles.phoneInput, { color: colors.textPrimary }]}
              value={form.phoneNumber}
              onChangeText={(t) => {
                // Only allow numbers and max 10 digits
                const cleaned = t.replace(/[^0-9]/g, '').slice(0, 10);
                setForm({ ...form, phoneNumber: cleaned });
              }}
              placeholder="88257 02072"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Date of Birth</Text>
          <Pressable 
            onPress={() => { Haptics.selectionAsync(); setShowDatePicker(true); }}
            style={[styles.input, styles.dateInput, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={{ color: form.dateOfBirth ? colors.textPrimary : colors.textMuted, fontSize: 16 }}>
              {formatDate(form.dateOfBirth)}
            </Text>
            <Feather name="calendar" size={18} color={colors.primary} />
          </Pressable>
        </View>

        <AnimatedButton
          onPress={handleSave}
          disabled={loading}
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
        </AnimatedButton>
      </ScrollView>

      <AppAlertModal
        visible={alert.visible}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        onClose={() => {
          setAlert({ ...alert, visible: false });
          if (alert.type === 'success') router.replace("/(tabs)");
        }}
      />

      {/* Custom Premium JS Date Picker Modal */}
      <Modal transparent animationType="slide" visible={showDatePicker}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Select Birth Date</Text>
            
            <View style={styles.pickerRow}>
              <View style={styles.pickerCol}>
                <Text style={styles.pickerLabel}>Day</Text>
                <TextInput 
                  style={[styles.miniInput, { color: colors.textPrimary, borderColor: colors.border }]}
                  value={tempDate.day}
                  onChangeText={(t) => setTempDate({...tempDate, day: t.slice(0,2)})}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
              <View style={styles.pickerCol}>
                <Text style={styles.pickerLabel}>Month</Text>
                <TextInput 
                  style={[styles.miniInput, { color: colors.textPrimary, borderColor: colors.border }]}
                  value={tempDate.month}
                  onChangeText={(t) => setTempDate({...tempDate, month: t.slice(0,2)})}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
              <View style={styles.pickerCol}>
                <Text style={styles.pickerLabel}>Year</Text>
                <TextInput 
                  style={[styles.miniInput, { color: colors.textPrimary, borderColor: colors.border }]}
                  value={tempDate.year}
                  onChangeText={(t) => setTempDate({...tempDate, year: t.slice(0,4)})}
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <Pressable onPress={() => setShowDatePicker(false)} style={styles.cancelBtn}>
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable onPress={confirmDate} style={[styles.confirmBtn, { backgroundColor: colors.primary }]}>
                <Text style={styles.confirmBtnText}>Confirm</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  scrollContent: { padding: 20 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8, marginLeft: 4 },
  input: { height: 56, borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 16, fontSize: 16, justifyContent: "center" },
  dateInput: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  saveBtn: { height: 58, borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: 10 },
  saveBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  phoneInputContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 0 },
  countryCode: { fontSize: 16, fontWeight: '600', paddingLeft: 16, paddingRight: 10 },
  divider: { width: 1, height: 24, marginRight: 10 },
  phoneInput: { flex: 1, height: '100%', fontSize: 16, paddingRight: 16 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalContent: { borderRadius: 24, padding: 24, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 20 },
  pickerRow: { flexDirection: 'row', gap: 15, marginBottom: 30 },
  pickerCol: { alignItems: 'center' },
  pickerLabel: { fontSize: 12, color: '#A89080', marginBottom: 5, fontWeight: '600' },
  miniInput: { width: 60, height: 50, borderWidth: 1.5, borderRadius: 12, textAlign: 'center', fontSize: 18, fontWeight: '600' },
  modalFooter: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn: { flex: 1, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  confirmBtn: { flex: 1, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '600' },
  confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
