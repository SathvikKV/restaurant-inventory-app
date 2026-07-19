import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useAuth } from "../../lib/auth-context";
import { receiveStock } from "../../lib/api";
import { colors, PrimaryButton } from "../../components/ui";

export default function ReceiveStockScreen() {
  const { auth } = useAuth();
  const { id, itemName, unit, currentQty } = useLocalSearchParams<{ id: string; itemName: string; unit: string; currentQty: string }>();
  const [qty, setQty] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    const val = parseFloat(qty);
    if (!val || !id) return;
    setLoading(true);
    try {
      await receiveStock(auth.token!, id, val, notes);
      Alert.alert("Done", "Stock received.");
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F7F8" }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingHorizontal: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center", paddingTop: 8, paddingBottom: 24 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}>
              <ChevronLeft size={24} color={colors.textMain} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 32, fontWeight: "800", color: colors.textMain, letterSpacing: -0.8, marginBottom: 4 }}>Receive Stock</Text>
          <Text style={{ fontSize: 15, color: colors.textMuted, fontWeight: "600", marginBottom: 32 }}>{itemName} · {currentQty} {unit} current</Text>

          <Text style={{ fontSize: 13, fontWeight: "800", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Quantity Received ({unit})</Text>
          <View style={{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 20, paddingVertical: 16, marginBottom: 24 }}>
            <TextInput value={qty} onChangeText={setQty} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textMuted} style={{ fontSize: 20, fontWeight: "800", color: colors.textMain, padding: 0 }} autoFocus />
          </View>

          <Text style={{ fontSize: 13, fontWeight: "800", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Notes (Optional)</Text>
          <View style={{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 20, paddingVertical: 16, marginBottom: 40 }}>
            <TextInput value={notes} onChangeText={setNotes} placeholder="e.g. Weekly delivery from supplier" placeholderTextColor={colors.textMuted} style={{ fontSize: 15, fontWeight: "600", color: colors.textMain, padding: 0 }} />
          </View>

          <PrimaryButton label={loading ? "Saving..." : "Confirm Receipt"} onPress={handleSave} disabled={!qty || loading} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
