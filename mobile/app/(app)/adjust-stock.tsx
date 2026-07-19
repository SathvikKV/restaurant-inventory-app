import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useAuth } from "../../lib/auth-context";
import { adjustStock } from "../../lib/api";
import { colors, PrimaryButton } from "../../components/ui";

const REASONS = ["Stock Correction", "Damaged Goods", "Theft", "Expired", "Other"];

export default function AdjustStockScreen() {
  const { auth } = useAuth();
  const { id, itemName, unit, currentQty } = useLocalSearchParams<{ id: string; itemName: string; unit: string; currentQty: string }>();
  const [adjustType, setAdjustType] = useState<"add" | "remove">("add");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("Stock Correction");
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    const val = parseFloat(qty);
    if (!val || !id) return;
    setLoading(true);
    try {
      const delta = adjustType === "add" ? val : -val;
      const newQty = Math.max(0, parseFloat(currentQty || "0") + delta);
      await adjustStock(auth.token!, id, newQty, reason);
      Alert.alert("Done", "Stock adjusted successfully.");
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
          {/* Nav */}
          <View style={{ flexDirection: "row", alignItems: "center", paddingTop: 8, paddingBottom: 24 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}>
              <ChevronLeft size={24} color={colors.textMain} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 32, fontWeight: "800", color: colors.textMain, letterSpacing: -0.8, marginBottom: 4 }}>Adjust Stock</Text>
          <Text style={{ fontSize: 15, color: colors.textMuted, fontWeight: "600", marginBottom: 32 }}>{itemName} · {currentQty} {unit} current</Text>

          {/* Add / Remove toggle */}
          <View style={{ flexDirection: "row", backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 4, marginBottom: 24 }}>
            {(["add", "remove"] as const).map(type => (
              <TouchableOpacity
                key={type}
                onPress={() => setAdjustType(type)}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 16, backgroundColor: adjustType === type ? colors.textMain : "transparent", alignItems: "center" }}
              >
                <Text style={{ fontSize: 14, fontWeight: "800", color: adjustType === type ? "white" : colors.textMuted, textTransform: "capitalize" }}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Quantity input */}
          <Text style={{ fontSize: 13, fontWeight: "800", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Quantity ({unit})</Text>
          <View style={{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 20, paddingVertical: 16, marginBottom: 24 }}>
            <TextInput
              value={qty}
              onChangeText={setQty}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              style={{ fontSize: 20, fontWeight: "800", color: colors.textMain, padding: 0 }}
              autoFocus
            />
          </View>

          {/* Reason */}
          <Text style={{ fontSize: 13, fontWeight: "800", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Reason</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 40 }}>
            {REASONS.map(r => (
              <TouchableOpacity
                key={r}
                onPress={() => setReason(r)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 100,
                  backgroundColor: reason === r ? colors.textMain : colors.card,
                  borderWidth: 1,
                  borderColor: reason === r ? colors.textMain : colors.border,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "800", color: reason === r ? "white" : colors.textMuted }}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <PrimaryButton label={loading ? "Saving..." : "Save Adjustment"} onPress={handleSave} disabled={!qty || loading} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
