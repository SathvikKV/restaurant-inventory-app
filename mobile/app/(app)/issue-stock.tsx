import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { INVENTORY } from "../../components/inventory-data";

const DESTINATIONS = ["Kitchen", "Bar", "Bakery", "Pantry", "Events"];

export default function IssueStockScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = INVENTORY.find(i => i.id === id);
  const [qty, setQty] = useState("");
  const [destination, setDestination] = useState("Kitchen");

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
            <Text className="text-[26px] font-bold text-kosh-textMain mb-1">Issue Stock</Text>
            <Text className="text-kosh-textMuted text-[15px] mb-8">
              {item?.name} · Available: {item?.quantity} {item?.unit}
            </Text>

            <View className="gap-5">
              <View>
                <Text className="text-[13px] font-bold text-kosh-textMuted mb-2 uppercase tracking-wide">
                  Quantity ({item?.unit})
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
                <Text className="text-[13px] font-bold text-kosh-textMuted mb-2 uppercase tracking-wide">Issue To</Text>
                <View className="flex-row flex-wrap gap-2">
                  {DESTINATIONS.map(dest => (
                    <TouchableOpacity
                      key={dest}
                      onPress={() => setDestination(dest)}
                      className={`px-4 py-2.5 rounded-full border ${destination === dest ? "bg-kosh-primary border-kosh-primary" : "bg-white border-kosh-border"}`}
                    >
                      <Text className={`text-[13px] font-semibold ${destination === dest ? "text-white" : "text-kosh-textMuted"}`}>
                        {dest}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => router.back()}
            disabled={!qty}
            className="w-full bg-kosh-primary py-[18px] rounded-full items-center"
            activeOpacity={0.85}
          >
            <Text className="text-white font-bold text-[17px]">Issue Stock</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
