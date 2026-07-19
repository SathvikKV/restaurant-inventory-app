import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useAuth } from "../../lib/auth-context";
import { logWastage } from "../../lib/api";
import { colors, PrimaryButton } from "../../components/ui";

const REASONS = ["Spoilage", "Expired", "Overcooked", "Damaged", "Spillage", "Other"];

export default function LogWastageScreen() {
  const { auth } = useAuth();
  const { id, itemName, unit } = useLocalSearchParams<{ id: string; itemName: string; unit: string }>();
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("Spoilage");
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    const val = parseFloat(qty);
    if (!val || !id) return;
    setLoading(true);
    try {
      await logWastage(auth.token!, itemName, val, unit, reason);
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
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
          <View style={{ flexDirection: "row", alignItems: "center", paddingTop: 8, paddingBottom: 24 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}>
              <ChevronLeft size={24} color={colors.textMain} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 32, fontWeight: "800", color: colors.textMain, letterSpacing: -0.8, marginBottom: 4 }}>Log Wastage</Text>
          <Text style={{ fontSize: 15, color: colors.textMuted, fontWeight: "600", marginBottom: 32 }}>{itemName} · {unit}</Text>

          <Text style={{ fontSize: 13, fontWeight: "800", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Quantity Wasted ({unit})</Text>
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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
