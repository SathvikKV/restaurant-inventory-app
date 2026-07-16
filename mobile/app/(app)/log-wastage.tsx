import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { loadAuth } from "../../lib/auth-store";
import { logWastage } from "../../lib/api";

const REASONS = ["Spoiled", "Expired", "Overcooked", "Damaged", "Spillage", "Other"];

export default function LogWastageScreen() {
  const { id, itemName, unit } = useLocalSearchParams<{ id: string; itemName: string; unit: string }>();
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("Spoiled");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!qty) return;
    setLoading(true);
    try {
      const auth = await loadAuth();
      if (!auth.token) throw new Error("Not authenticated");
      await logWastage(auth.token, itemName, parseFloat(qty), unit, reason);
      Alert.alert("Success", "Wastage logged", [{ text: "OK", onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to log wastage");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-kosh-bg">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-5 pt-4 pb-8">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 -ml-2 rounded-full items-center justify-center mb-4"
            >
              <Text className="text-[28px] text-kosh-textMain">‹</Text>
            </TouchableOpacity>
            <Text className="text-[26px] font-bold text-kosh-textMain mb-1">Log Wastage</Text>
            <Text className="text-kosh-textMuted text-[15px] mb-8">{itemName}</Text>

            <View className="gap-5">
              <View>
                <Text className="text-[13px] font-bold text-kosh-textMuted mb-2 uppercase tracking-wide">
                  Quantity Wasted ({unit})
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
                <Text className="text-[13px] font-bold text-kosh-textMuted mb-2 uppercase tracking-wide">Reason</Text>
                <View className="flex-row flex-wrap gap-2">
                  {REASONS.map(r => (
                    <TouchableOpacity
                      key={r}
                      onPress={() => setReason(r)}
                      className={`px-4 py-2.5 rounded-full border ${reason === r ? "bg-kosh-primary border-kosh-primary" : "bg-white border-kosh-border"}`}
                    >
                      <Text className={`text-[13px] font-semibold ${reason === r ? "text-white" : "text-kosh-textMuted"}`}>
                        {r}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View>
                <Text className="text-[13px] font-bold text-kosh-textMuted mb-2 uppercase tracking-wide">Notes (Optional)</Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  className="bg-white rounded-2xl px-5 py-4 text-kosh-textMain text-[15px] border border-kosh-border"
                  placeholder="Additional details..."
                  placeholderTextColor="#687076"
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={handleSave}
              disabled={!qty || loading}
              className="w-full bg-kosh-primary py-[18px] rounded-full items-center"
              style={{ marginTop: 32 }}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="white" />
                : <Text className="text-white font-bold text-[17px]">Log Wastage</Text>
              }
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
