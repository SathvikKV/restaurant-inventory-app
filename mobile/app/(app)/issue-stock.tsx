import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useAuth } from "../../lib/auth-context";
import { issueStock } from "../../lib/api";
import { colors, PrimaryButton } from "../../components/ui";

const DESTINATIONS = ["Main Kitchen", "Bar", "Bakery", "Pantry", "Events"];

export default function IssueStockScreen() {
  const { auth } = useAuth();
  const { id, itemName, unit, currentQty } = useLocalSearchParams<{ id: string; itemName: string; unit: string; currentQty: string }>();
  const [qty, setQty] = useState("");
  const [destination, setDestination] = useState("Main Kitchen");
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    const val = parseFloat(qty);
    if (!val || !id) return;
    setLoading(true);
    try {
      await issueStock(auth.token!, id, val, destination);
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
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingHorizontal: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center", paddingTop: 8, paddingBottom: 24 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}>
              <ChevronLeft size={24} color={colors.textMain} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 32, fontWeight: "800", color: colors.textMain, letterSpacing: -0.8, marginBottom: 4 }}>Issue Stock</Text>
          <Text style={{ fontSize: 15, color: colors.textMuted, fontWeight: "600", marginBottom: 32 }}>{itemName} · {currentQty} {unit} available</Text>

          <Text style={{ fontSize: 13, fontWeight: "800", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Quantity ({unit})</Text>
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
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
