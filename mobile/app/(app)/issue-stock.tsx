import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, ChevronDown } from "lucide-react-native";
import { useAuth } from "../../lib/auth-context";
import { issueStock } from "../../lib/api";
import { colors, PrimaryButton } from "../../components/ui";
import { SelectItemSheet } from "../../components/SelectItemSheet";
import { CategoryIcon } from "../../components/CategoryIcon";

const DESTINATIONS = ["Main Kitchen", "Bar", "Bakery", "Pantry", "Events"];

export default function IssueStockScreen() {
  const { auth } = useAuth();
  const params = useLocalSearchParams<{ id: string; itemName: string; unit: string; currentQty: string }>();

  const [selectedItem, setSelectedItem] = useState<{ id: string; name: string; unit: string; quantity: number; category: string | null } | null>(
    params.id ? { id: params.id, name: params.itemName, unit: params.unit, quantity: parseFloat(params.currentQty || "0"), category: null } : null
  );
  const [showPicker, setShowPicker] = useState(!params.id);
  const [qty, setQty] = useState("");
  const [destination, setDestination] = useState("Main Kitchen");
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!selectedItem || !qty) return;
    const val = parseFloat(qty);
    if (!val) return;
    setLoading(true);
    try {
      await issueStock(auth.token!, selectedItem.id, val, destination);
      Alert.alert("Done", "Stock issued successfully.");
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
        <View style={{ flex: 1, paddingHorizontal: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center", paddingTop: 8, paddingBottom: 24 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}>
              <ChevronLeft size={24} color={colors.textMain} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 32, fontWeight: "800", color: colors.textMain, letterSpacing: -0.8, marginBottom: 24 }}>Issue Stock</Text>

          <TouchableOpacity
            onPress={() => setShowPicker(true)}
            style={{ backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 16, flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 24 }}
          >
            {selectedItem ? (
              <>
                <CategoryIcon category={selectedItem.category} size={48} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: colors.textMain }}>{selectedItem.name}</Text>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textMuted }}>{selectedItem.quantity} {selectedItem.unit} available</Text>
                </View>
                <ChevronDown size={18} color={colors.textMuted} strokeWidth={2} />
              </>
            ) : (
              <>
                <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: "#F4F5F7", alignItems: "center", justifyContent: "center" }}>
                  <ChevronDown size={22} color={colors.textMuted} strokeWidth={2} />
                </View>
                <Text style={{ flex: 1, fontSize: 15, fontWeight: "700", color: colors.textMuted }}>Select an item...</Text>
              </>
            )}
          </TouchableOpacity>

          {selectedItem && (
            <>
              <Text style={{ fontSize: 13, fontWeight: "800", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Quantity ({selectedItem.unit})</Text>
              <View style={{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 20, paddingVertical: 16, marginBottom: 24 }}>
                <TextInput value={qty} onChangeText={setQty} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textMuted} style={{ fontSize: 20, fontWeight: "800", color: colors.textMain, padding: 0 }} autoFocus />
              </View>

              <Text style={{ fontSize: 13, fontWeight: "800", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Issue To</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 40 }}>
                {DESTINATIONS.map(d => (
                  <TouchableOpacity key={d} onPress={() => setDestination(d)} style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100, backgroundColor: destination === d ? colors.textMain : colors.card, borderWidth: 1, borderColor: destination === d ? colors.textMain : colors.border }}>
                    <Text style={{ fontSize: 13, fontWeight: "800", color: destination === d ? "white" : colors.textMuted }}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <PrimaryButton label={loading ? "Issuing..." : "Issue Stock"} onPress={handleSave} disabled={!qty || loading} />
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
