import { AnimatedButton } from "@/components/AnimatedButton"; // Refreshed
import { Text, TextInput } from "@/components/Typography";
import { Feather } from "@expo/vector-icons";
import {
  useGetSettings,
  useGetUsers,
  useGetVenues,
  useUpdateVenuePrice,
} from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { AppAlertModal } from "@/components/AppAlertModal";
import { useLanguage } from "@/context/LanguageContext";
import { getApiBaseUrl } from "@/lib/apiBaseUrl";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { logout, token } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const { refetch: refetchVenues } = useGetVenues({ query: { queryKey: ["venues"], enabled: false } });
  const { data: settingsData, refetch: refetchSettings } = useGetSettings({ query: { queryKey: ["settings"] } });
  const { data: users } = useGetUsers({ query: { queryKey: ["users"] } });

  const [alert, setAlert] = useState<{ visible: boolean; type: 'success' | 'error'; title: string; message: string }>({
    visible: false,
    type: 'success',
    title: '',
    message: '',
  });

  // const updateVenueMutation = ... (removed)

  // const [localPrices, setLocalPrices] = useState<Record<string, string>>({});
  const [bizForm, setBizForm] = useState({
    biz_name: "",
    biz_tagline: "",
    biz_address: "",
    biz_phone: "",
    biz_email: "",
    biz_gst: "",
  });
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingBiz, setIsSavingBiz] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);

  // Sync bizForm with settingsData when loaded
  React.useEffect(() => {
    if (settingsData) {
      setBizForm({
        biz_name: settingsData.biz_name ?? "",
        biz_tagline: settingsData.biz_tagline ?? "",
        biz_address: settingsData.biz_address ?? "",
        biz_phone: settingsData.biz_phone ?? "",
        biz_email: settingsData.biz_email ?? "",
        biz_gst: settingsData.biz_gst ?? "",
      });
    }
  }, [settingsData]);

  const handleUploadRulesPdf = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets[0]) return;

      setIsUploading(true);
      const fileUri = result.assets[0].uri;

      const fileResponse = await fetch(fileUri);
      const blob = await fileResponse.blob();

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          const b64 = dataUrl.split(",")[1] ?? dataUrl;
          resolve(b64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const res = await fetch(`${getApiBaseUrl()}/api/settings/rules-pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ pdfData: base64 }),
      });

      if (!res.ok) throw new Error("Upload failed");
      
      refetchSettings();
      setAlert({ visible: true, type: 'success', title: 'Upload Complete', message: 'The Rules PDF has been uploaded and synced successfully.' });
    } catch (err: any) {
      setAlert({ visible: true, type: 'error', title: 'Upload Error', message: err.message || 'Something went wrong during the upload.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveBusinessInfo = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsSavingBiz(true);
      
      const res = await fetch(`${getApiBaseUrl()}/api/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(bizForm),
      });

      if (!res.ok) throw new Error("Failed to save business info");
      
      refetchSettings();
      setAlert({ 
        visible: true, 
        type: 'success', 
        title: 'Settings Saved', 
        message: 'Your business profile and PDF contact details have been updated.' 
      });
    } catch (err: any) {
      setAlert({ 
        visible: true, 
        type: 'error', 
        title: 'Save Error', 
        message: err.message || 'Could not update business settings.' 
      });
    } finally {
      setIsSavingBiz(false);
    }
  };

  const handlePreviewPdf = async () => {
    try {
      setIsPreviewing(true);
      const pdfUrl = `${getApiBaseUrl()}/api/settings/rules-pdf`;
      
      await WebBrowser.openBrowserAsync(pdfUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        controlsColor: colors.primary,
        toolbarColor: colors.background,
      });
    } catch (err) {
      setAlert({ visible: true, type: 'error', title: 'File Not Found', message: 'No rules PDF has been uploaded yet.' });
    } finally {
      setIsPreviewing(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t("settings")}</Text>

        <SectionHeader title={t("selectLanguageSetting")} icon="globe" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.rulesActions}>
            <Pressable
              style={[styles.rulesBtn, { backgroundColor: language === "en" ? colors.primary : colors.secondary }]}
              onPress={() => setLanguage("en")}
            >
              <Text style={[styles.rulesBtnText, { color: language === "en" ? "#fff" : colors.textSecondary }]}>{t("english")}</Text>
            </Pressable>
            <Pressable
              style={[styles.rulesBtn, { backgroundColor: language === "ta" ? colors.primary : colors.secondary }]}
              onPress={() => setLanguage("ta")}
            >
              <Text style={[styles.rulesBtnText, { color: language === "ta" ? "#fff" : colors.textSecondary }]}>{t("tamil")}</Text>
            </Pressable>
          </View>
        </View>

        <SectionHeader title={t("venuePricing")} icon="dollar-sign" colors={colors} />
        <AnimatedButton
          style={[styles.card, styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 16 }]}
          onPress={() => router.push("/manage-venues")}
        >
          <View style={styles.menuContent}>
            <Feather name="plus-square" size={20} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.textPrimary }]}>{t("manageVenues")}</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.textMuted} />
        </AnimatedButton>

        <SectionHeader title={t("businessInformation")} icon="briefcase" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t("businessName")}</Text>
          <TextInput
            style={[styles.bizInput, { color: colors.textPrimary, borderColor: colors.border }]}
            value={bizForm.biz_name}
            onChangeText={(t) => setBizForm({ ...bizForm, biz_name: t })}
            placeholder="e.g. Bookal Venues"
          />

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t("taglineMotto")}</Text>
          <TextInput
            style={[styles.bizInput, { color: colors.textPrimary, borderColor: colors.border }]}
            value={bizForm.biz_tagline}
            onChangeText={(t) => setBizForm({ ...bizForm, biz_tagline: t })}
            placeholder="e.g. Excellence in Hospitality"
          />

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t("gstNumber")}</Text>
          <TextInput
            style={[styles.bizInput, { color: colors.textPrimary, borderColor: colors.border }]}
            value={bizForm.biz_gst}
            onChangeText={(t) => setBizForm({ ...bizForm, biz_gst: t })}
            placeholder="e.g. 33AAAAA0000A1Z5"
            autoCapitalize="characters"
          />

          <View style={styles.bizRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t("phone")}</Text>
              <TextInput
                style={[styles.bizInput, { color: colors.textPrimary, borderColor: colors.border }]}
                value={bizForm.biz_phone}
                onChangeText={(t) => setBizForm({ ...bizForm, biz_phone: t })}
                keyboardType="phone-pad"
              />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t("email")}</Text>
              <TextInput
                style={[styles.bizInput, { color: colors.textPrimary, borderColor: colors.border }]}
                value={bizForm.biz_email}
                onChangeText={(t) => setBizForm({ ...bizForm, biz_email: t })}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t("addressSetting")}</Text>
          <TextInput
            style={[styles.bizInput, styles.addressInput, { color: colors.textPrimary, borderColor: colors.border }]}
            value={bizForm.biz_address}
            onChangeText={(t) => setBizForm({ ...bizForm, biz_address: t })}
            multiline
            numberOfLines={2}
          />

          <AnimatedButton
            style={[styles.saveBizBtn, { backgroundColor: colors.primary }]}
            onPress={handleSaveBusinessInfo}
            disabled={isSavingBiz}
          >
            {isSavingBiz ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBizBtnText}>{t("saveBusinessProfile")}</Text>}
          </AnimatedButton>
        </View>

        <SectionHeader title={t("rulesDocuments")} icon="file-text" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.rulesHeader, { color: colors.textPrimary }]}>{t("currentRulesPdf")}</Text>
          <View style={styles.rulesFileRow}>
            <Feather name="paperclip" size={16} color={colors.textSecondary} />
            <Text style={[styles.rulesFileName, { color: colors.textSecondary }]}>
              {settingsData?.rules_pdf_path ? settingsData.rules_pdf_path : t("noRulesPdf")}
            </Text>
          </View>
          
          <View style={styles.rulesActions}>
            <Pressable style={[styles.rulesBtn, { backgroundColor: colors.secondary }]} onPress={handlePreviewPdf}>
              <Feather name="eye" size={16} color={colors.textSecondary} />
              <Text style={[styles.rulesBtnText, { color: colors.textSecondary }]}>{t("preview")}</Text>
            </Pressable>
            <Pressable style={[styles.rulesBtn, { backgroundColor: colors.primary }]} onPress={handleUploadRulesPdf}>
              {isUploading ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="upload" size={16} color="#fff" />}
              <Text style={[styles.rulesBtnText, { color: "#fff" }]}>{t("upload")}</Text>
            </Pressable>
          </View>
        </View>

        <SectionHeader title={t("team")} icon="users" colors={colors} />
        <AnimatedButton
          style={[styles.card, styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push("/manage-employees")}
        >
          <View style={styles.menuContent}>
            <Feather name="users" size={20} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.textPrimary }]}>{t("manageEmployees")}</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.textMuted} />
        </AnimatedButton>

        <SectionHeader title={t("account")} icon="user" colors={colors} />
        <AnimatedButton
          style={[styles.card, styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push("/edit-profile")}
        >
          <View style={styles.menuContent}>
            <Feather name="edit-3" size={20} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.textPrimary }]}>{t("editProfile")}</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.textMuted} />
        </AnimatedButton>

        <AnimatedButton
          style={[styles.card, styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push("/change-password")}
        >
          <View style={styles.menuContent}>
            <Feather name="lock" size={20} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.textPrimary }]}>{t("changePassword")}</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.textMuted} />
        </AnimatedButton>

        <AnimatedButton
          style={[styles.card, styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 20 }]}
          onPress={logout}
        >
          <View style={styles.menuContent}>
            <Feather name="log-out" size={20} color={colors.destructive} />
            <Text style={[styles.menuText, { color: colors.destructive }]}>{t("logout")}</Text>
          </View>
        </AnimatedButton>
      </ScrollView>

      <AppAlertModal
        visible={alert.visible}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        onClose={() => setAlert({ ...alert, visible: false })}
      />
    </View>
  );
}

function SectionHeader({ title, icon, colors }: any) {
  return (
    <View style={styles.sectionHeader}>
      <Feather name={icon} size={14} color={colors.textSecondary} />
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  title: { fontSize: 28, fontWeight: "800", marginBottom: 24 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12, marginTop: 12 },
  sectionTitle: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  venueRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  venueInfo: { flex: 1 },
  venueName: { fontSize: 16, fontWeight: "700" },
  venueType: { fontSize: 13 },
  priceEdit: { flexDirection: "row", alignItems: "center", gap: 4 },
  currency: { fontSize: 16, fontWeight: "600" },
  priceInput: { fontSize: 18, fontWeight: "700", width: 80, textAlign: "center" },
  saveMiniBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  saveMiniBtnText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  rulesHeader: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  rulesFileRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  rulesFileName: { fontSize: 13, marginLeft: 8 },
  rulesActions: { flexDirection: "row", justifyContent: "space-between" },
  rulesBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    flex: 0.48,
  },
  rulesBtnText: { marginLeft: 8, fontSize: 14, fontWeight: "600" },
  inputLabel: { fontSize: 12, fontWeight: "600", marginBottom: 4, marginTop: 12 },
  bizInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  bizRow: { flexDirection: "row", justifyContent: "space-between" },
  addressInput: { height: 60, textAlignVertical: "top" },
  saveBizBtn: {
    marginTop: 20,
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  saveBizBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  menuCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  menuContent: { flexDirection: "row", alignItems: "center", gap: 12 },
  menuText: { fontSize: 16, fontWeight: "600" },
});
