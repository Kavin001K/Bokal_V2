import { Button } from "@/components/Button";
import { Text, TextInput } from "@/components/Typography";
import { Feather } from "@expo/vector-icons";
import { useGetVenues } from "@workspace/api-client-react";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/Skeleton";
import { getApiBaseUrl } from "@/lib/apiBaseUrl";

const CATEGORIES = [
  { label: "Main Mahal", value: "mahal" },
  { label: "AC Room", value: "ac_room" },
  { label: "Non-AC Room", value: "non_ac_room" },
  { label: "Dining Hall", value: "dining_hall" },
  { label: "Other", value: "other" },
];

const AMENITIES = [
  { id: "ac", label: "Air Conditioning", icon: "wind" },
  { id: "wifi", label: "Free WiFi", icon: "wifi" },
  { id: "parking", label: "Parking Space", icon: "truck" },
  { id: "catering", label: "In-house Catering", icon: "coffee" },
  { id: "stage", label: "Large Stage", icon: "layers" },
  { id: "audio", label: "Sound System", icon: "speaker" },
];

const COLORS = ["#C75B2A", "#2A9D5C", "#3B82F6", "#E63946", "#E9C46A", "#8B5CF6"];

export default function ManageVenuesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingVenue, setEditingVenue] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [type, setType] = useState("mahal");
  const [category, setCategory] = useState("other");
  const [price, setPrice] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);

  const [venues, setVenues] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchVenues = async () => {
    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/venues?all=true`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setVenues(data);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchVenues();
  }, [token]);

  const refetch = fetchVenues;

  const resetForm = () => {
    setName("");
    setType("mahal");
    setCategory("other");
    setPrice("");
    setSelectedAmenities([]);
    setSelectedColor(COLORS[0]);
    setEditingVenue(null);
  };

  const handleEdit = (venue: any) => {
    setEditingVenue(venue);
    setName(venue.name);
    setType(venue.type);
    setCategory(venue.venueCategory || "other");
    setPrice(String(venue.pricePerHour));
    setSelectedAmenities(venue.amenities || []);
    setSelectedColor(venue.colorTag || COLORS[0]);
    setModalVisible(true);
  };

  const saveVenue = async () => {
    if (!name || !price) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const baseUrl = getApiBaseUrl();
      const url = editingVenue 
        ? `${baseUrl}/api/venues/${editingVenue.id}`
        : `${baseUrl}/api/venues`;
      
      const method = editingVenue ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          type,
          venueCategory: category,
          amenities: selectedAmenities,
          colorTag: selectedColor,
          pricePerHour: parseFloat(price),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to save venue");
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setModalVisible(false);
      resetForm();
      refetch();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Something went wrong while saving the venue");
    } finally {
      setLoading(false);
    }
  };

  const deleteVenue = async () => {
    if (!editingVenue) return;
    
    Alert.alert(
      "Delete Venue",
      `Are you sure you want to delete ${editingVenue.name}? This will mark it as inactive.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              const baseUrl = getApiBaseUrl();
              const response = await fetch(`${baseUrl}/api/venues/${editingVenue.id}`, {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });

              if (!response.ok) throw new Error("Failed to delete venue");

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setModalVisible(false);
              resetForm();
              refetch();
            } catch (error: any) {
              Alert.alert("Error", error.message || "Could not delete venue");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const toggleVenueActive = async () => {
    if (!editingVenue) return;
    
    setLoading(true);
    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/venues/${editingVenue.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          isActive: !editingVenue.isActive,
        }),
      });

      if (!response.ok) throw new Error("Failed to update venue status");

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setModalVisible(false);
      resetForm();
      refetch();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Could not update venue status");
    } finally {
      setLoading(false);
    }
  };

  const toggleAmenity = (id: string) => {
    setSelectedAmenities(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const sortedVenues = venues ? [...venues].sort((a, b) => {
    // 1. Sort by active status (Active first)
    if (a.isActive !== b.isActive) {
      return a.isActive ? -1 : 1;
    }
    // 2. Then sort by display order
    return (a.displayOrder || 0) - (b.displayOrder || 0);
  }) : [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Manage Venues</Text>
        <Pressable 
          onPress={() => {
            resetForm();
            setModalVisible(true);
          }} 
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
        >
          <Feather name="plus" size={20} color="#fff" />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={{ padding: 20, gap: 16 }}>
          {[1, 2, 3].map(i => (
            <Skeleton key={i} width="100%" height={100} borderRadius={20} />
          ))}
        </View>
      ) : (
        <FlatList
          data={sortedVenues}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
          renderItem={({ item }) => (
            <Pressable 
              style={[
                styles.venueCard, 
                { backgroundColor: colors.card, borderColor: colors.border },
                !item.isActive && { opacity: 0.5 }
              ]}
              onPress={() => handleEdit(item)}
            >
              <View style={[styles.colorIndicator, { backgroundColor: item.colorTag }]} />
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text style={styles.venueName}>{item.name}</Text>
                  {!item.isActive && (
                    <View style={[styles.badge, { backgroundColor: colors.destructive + '15' }]}>
                      <Text style={[styles.badgeText, { color: colors.destructive }]}>Disabled</Text>
                    </View>
                  )}
                  <View style={[styles.badge, { backgroundColor: colors.primary + '15' }]}>
                    <Text style={[styles.badgeText, { color: colors.primary }]}>
                      {CATEGORIES.find(c => c.value === item.venueCategory)?.label || item.venueCategory}
                    </Text>
                  </View>
                </View>
                <Text style={styles.venuePrice}>₹{item.pricePerHour}/hr</Text>
                <View style={styles.amenitiesRow}>
                  {(item.amenities || []).slice(0, 3).map((a: string) => (
                    <View key={a} style={[styles.amenityMini, { backgroundColor: colors.secondary }]}>
                      <Feather name={AMENITIES.find(am => am.id === a)?.icon as any || "check"} size={10} color={colors.textMuted} />
                      <Text style={[styles.amenityMiniText, { color: colors.textSecondary }]}>{AMENITIES.find(am => am.id === a)?.label}</Text>
                    </View>
                  ))}
                  {(item.amenities || []).length > 3 && (
                    <Text style={[styles.moreText, { color: colors.textMuted }]}>+{(item.amenities || []).length - 3} more</Text>
                  )}
                </View>
              </View>
              <Feather name="chevron-right" size={20} color={colors.border} />
            </Pressable>
          )}
        />
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingVenue ? "Edit Venue" : "New Venue"}</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Feather name="x" size={24} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Venue Name</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border }]}
                  placeholder="e.g. Grand Mahal"
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Base Price (₹/hr)</Text>
                  <TextInput
                    style={[styles.input, { borderColor: colors.border }]}
                    placeholder="0.00"
                    keyboardType="numeric"
                    value={price}
                    onChangeText={setPrice}
                  />
                </View>
              </View>

              <Text style={styles.label}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
                {CATEGORIES.map(cat => (
                  <Pressable
                    key={cat.value}
                    onPress={() => setCategory(cat.value)}
                    style={[
                      styles.pill,
                      { borderColor: colors.border },
                      category === cat.value && { backgroundColor: colors.primary, borderColor: colors.primary }
                    ]}
                  >
                    <Text style={[styles.pillText, category === cat.value && { color: "#fff" }]}>{cat.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={styles.label}>Amenities</Text>
              <View style={styles.amenitiesGrid}>
                {AMENITIES.map(amenity => (
                  <Pressable
                    key={amenity.id}
                    onPress={() => toggleAmenity(amenity.id)}
                    style={[
                      styles.amenityItem,
                      { borderColor: colors.border },
                      selectedAmenities.includes(amenity.id) && { backgroundColor: colors.primary + '10', borderColor: colors.primary }
                    ]}
                  >
                    <Feather 
                      name={amenity.icon as any} 
                      size={16} 
                      color={selectedAmenities.includes(amenity.id) ? colors.primary : colors.textMuted} 
                    />
                    <Text style={[
                      styles.amenityLabel,
                      selectedAmenities.includes(amenity.id) && { color: colors.primary, fontWeight: '700' }
                    ]}>
                      {amenity.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Theme Color</Text>
              <View style={styles.colorRow}>
                {COLORS.map(c => (
                  <Pressable
                    key={c}
                    onPress={() => setSelectedColor(c)}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: c },
                      selectedColor === c && { borderWidth: 3, borderColor: colors.textPrimary }
                    ]}
                  />
                ))}
              </View>

              <Button
                label={editingVenue ? "Update Venue" : "Create Venue"}
                onPress={saveVenue}
                loading={loading}
                style={styles.saveBtn}
              />

              {editingVenue && (
                <View style={styles.dangerZone}>
                  <Pressable 
                    style={[styles.actionBtn, { borderColor: colors.border }]}
                    onPress={toggleVenueActive}
                  >
                    <Feather name={editingVenue.isActive ? "eye-off" : "eye"} size={18} color={colors.textSecondary} />
                    <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>
                      {editingVenue.isActive ? "Disable Venue" : "Enable Venue"}
                    </Text>
                  </Pressable>
                  
                  <Pressable 
                    style={[styles.actionBtn, { borderColor: colors.destructive + '30' }]}
                    onPress={deleteVenue}
                  >
                    <Feather name="trash-2" size={18} color={colors.destructive} />
                    <Text style={[styles.actionBtnText, { color: colors.destructive }]}>Delete Venue</Text>
                  </Pressable>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    justifyContent: 'space-between',
  },
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  addBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 20, gap: 16 },
  venueCard: {
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    overflow: 'hidden',
  },
  colorIndicator: {
    width: 6,
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 16,
    bottom: 16,
    borderRadius: 3,
  },
  cardContent: { flex: 1, marginLeft: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  venueName: { fontSize: 16, fontWeight: '700' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  venuePrice: { fontSize: 14, fontWeight: '600', opacity: 0.7, marginBottom: 8 },
  amenitiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amenityMini: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f0f0f0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  amenityMiniText: { fontSize: 9, color: '#666' },
  moreText: { fontSize: 9, color: '#999' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { height: '90%', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 24, fontWeight: '800' },
  form: { gap: 20 },
  inputGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: '700', opacity: 0.8 },
  input: { height: 56, borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 16, fontSize: 16 },
  row: { flexDirection: 'row', gap: 16 },
  pillScroll: { marginBottom: 8 },
  pill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, marginRight: 8 },
  pillText: { fontSize: 13, fontWeight: '600' },
  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  amenityItem: { width: '48%', flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1.5 },
  amenityLabel: { fontSize: 12 },
  colorRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  colorCircle: { width: 36, height: 36, borderRadius: 18 },
  saveBtn: { marginTop: 10, height: 60, borderRadius: 20 },
  dangerZone: { marginTop: 24, gap: 12, paddingBottom: 40 },
  actionBtn: { 
    height: 56, 
    borderRadius: 16, 
    borderWidth: 1.5, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 10 
  },
  actionBtnText: { fontSize: 15, fontWeight: '700' },
});
