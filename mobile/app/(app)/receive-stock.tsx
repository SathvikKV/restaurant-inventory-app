import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "../../lib/auth-context";
import { receiveStock } from "../../lib/api";

export default function ReceiveStockScreen() {
  const { auth } = useAuth();
  const { id, itemName, unit, currentQty } = useLocalSearchParams<{ id: string; itemName: string; unit: string; currentQty: string }>();
  const [qty, setQty] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!qty) return;
    setLoading(true);
    try {
      if (!auth.token) throw new Error("Not authenticated");
      await receiveStock(auth.token, id, parseFloat(qty), notes || undefined);
      Alert.alert("Success", "Stock received", [{ text: "OK", onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to receive stock");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-kosh-bg">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <View className="flex-1 px-5 pt-4 pb-8 justify-between">
          <View>
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 -ml-2 rounded-full items-center justify-center mb-4"
            >
              <Text className="text-[28px] text-kosh-textMain">‹</Text>
            </TouchableOpacity>
            <Text className="text-[26px] font-bold text-kosh-textMain mb-1">Receive Stock</Text>
            <Text className="text-kosh-textMuted text-[15px] mb-8">
              {itemName} · Current: {currentQty} {unit}
            </Text>

            <View className="gap-5">
              <View>
                <Text className="text-[13px] font-bold text-kosh-textMuted mb-2 uppercase tracking-wide">
                  Quantity Received ({unit})
                </Text>
                <TextInput
                  value={qty}
                  onChangeText={setQty}
                  keyboardType="numeric"
                  className="bg-white rounded-2xl px-5 py-4 text-kosh-textMain font-bold text-[18px] border border-kosh-border"
                  placeholder="0"
                  placeholderTextColor="#687076"
                />
              </View>
              <View>
                <Text className="text-[13px] font-bold text-kosh-textMuted mb-2 uppercase tracking-wide">Notes (Optional)</Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  className="bg-white rounded-2xl px-5 py-4 text-kosh-textMain text-[15px] border border-kosh-border"
                  placeholder="e.g. Delivery from KY Vegetables"
                  placeholderTextColor="#687076"
                />
              </View>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleSave}
            disabled={!qty || loading}
            className="w-full bg-kosh-primary py-[18px] rounded-full items-center"
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="white" />
              : <Text className="text-white font-bold text-[17px]">Confirm Receipt</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
