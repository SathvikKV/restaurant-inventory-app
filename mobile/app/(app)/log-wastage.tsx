import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, ChevronDown } from "lucide-react-native";
import { useAuth } from "../../lib/auth-context";
import { logWastage } from "../../lib/api";
import { colors, PrimaryButton } from "../../components/ui";
import { SelectItemSheet } from "../../components/SelectItemSheet";
import { CategoryIcon } from "../../components/CategoryIcon";

const REASONS = ["Spoilage", "Expired", "Overcooked", "Damaged", "Spillage", "Other"];

export default function LogWastageScreen() {
  const { auth } = useAuth();
  const params = useLocalSearchParams<{ id: string; itemName: string; unit: string }>();

  const [selectedItem, setSelectedItem] = useState<{ id: string; name: string; unit: string; quantity: number; category: string | null } | null>(
    params.id ? { id: params.id, name: params.itemName, unit: params.unit, quantity: 0, category: null } : null
  );
  const [showPicker, setShowPicker] = useState(!params.id);
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("Spoilage");
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!selectedItem || !qty) return;
    const val = parseFloat(qty);
    if (!val) return;
    setLoading(true);
    try {
      await logWastage(auth.token!, selectedItem.name, val, selectedItem.unit, reason);
      Alert.alert("Done", "Wastage logged.");
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F7F8" }}>
      <SelectItemSheet
        visible={showPicker}
        token={auth.token || ""}
        onSelect={item => setSelectedItem(item)}
        onClose={() => { if (!selectedItem) router.back(); else setShowPicker(false); }}
      />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
          <View style={{ flexDirection: "row", alignItems: "center", paddingTop: 8, paddingBottom: 24 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}>
              <ChevronLeft size={24} color={colors.textMain} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 32, fontWeight: "800", color: colors.textMain, letterSpacing: -0.8, marginBottom: 24 }}>Log Wastage</Text>

          <TouchableOpacity
            onPress={() => setShowPicker(true)}
            style={{ backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 16, flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 24 }}
          >
            {selectedItem ? (
              <>
                <CategoryIcon category={selectedItem.category} size={48} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: colors.textMain }}>{selectedItem.name}</Text>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textMuted }}>{selectedItem.unit}</Text>
                </View>
                <ChevronDown size={18} color={colors.textMuted} strokeWidth={2} />
              </>
            ) : (
              <>
                <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: "#FEF2F2", alignItems: "center", justifyContent: "center" }}>
                  <ChevronDown size={22} color="#DC2626" strokeWidth={2} />
                </View>
                <Text style={{ flex: 1, fontSize: 15, fontWeight: "700", color: colors.textMuted }}>Select an item...</Text>
              </>
            )}
          </TouchableOpacity>

          {selectedItem && (
            <>
              <Text style={{ fontSize: 13, fontWeight: "800", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Quantity Wasted ({selectedItem.unit})</Text>
              <View style={{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 20, paddingVertical: 16, marginBottom: 24 }}>
                <TextInput value={qty} onChangeText={setQty} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textMuted} style={{ fontSize: 20, fontWeight: "800", color: colors.textMain, padding: 0 }} autoFocus />
              </View>

              <Text style={{ fontSize: 13, fontWeight: "800", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Reason</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 40 }}>
                {REASONS.map(r => (
                  <TouchableOpacity key={r} onPress={() => setReason(r)} style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100, backgroundColor: reason === r ? "#FEF2F2" : colors.card, borderWidth: 1, borderColor: reason === r ? "#FECACA" : colors.border }}>
                    <Text style={{ fontSize: 13, fontWeight: "800", color: reason === r ? "#DC2626" : colors.textMuted }}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <PrimaryButton label={loading ? "Saving..." : "Log Wastage"} onPress={handleSave} disabled={!qty || loading} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
