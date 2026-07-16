import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { createRestaurant, selectRestaurant } from "../../lib/api";
import { loadAuth, saveAuth } from "../../lib/auth-store";

export default function CreateRestaurantScreen() {
  const [name, setName] = useState("Minerva Coffee Shop");
  const [city, setCity] = useState("Hyderabad");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setLoading(true);
    try {
      const auth = await loadAuth();
      if (!auth.token) throw new Error("Not authenticated");
      const restaurant = await createRestaurant(auth.token, name, city);
      const selected = await selectRestaurant(auth.token, restaurant.id);
      await saveAuth({
        ...auth,
        token: selected.access_token,
        tenantId: restaurant.id,
        schema: selected.schema,
        restaurantName: selected.restaurant_name,
        needsRestaurantSelection: false,
      });
      router.push("/onboarding/create-branch");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to create restaurant");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-kosh-bg">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 px-6 pt-6 pb-12 justify-between">
          <View>
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 -ml-2 rounded-full items-center justify-center mb-6"
            >
              <Text className="text-[28px] text-kosh-textMain">‹</Text>
            </TouchableOpacity>
            <Text className="text-[32px] font-bold text-kosh-textMain mb-4">
              Create your workspace
            </Text>
            <Text className="text-kosh-textMuted text-[16px] mb-10 font-medium leading-relaxed">
              This is your restaurant's central hub.
            </Text>
            <View className="gap-6">
              <View>
                <Text className="text-[13px] font-bold text-kosh-textMuted mb-2 ml-1 tracking-wide">
                  RESTAURANT NAME
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  className="w-full bg-white rounded-[20px] px-5 py-[18px] text-kosh-textMain font-bold text-[17px] border border-kosh-border"
                />
              </View>
              <View>
                <Text className="text-[13px] font-bold text-kosh-textMuted mb-2 ml-1 tracking-wide">
                  CITY
                </Text>
                <TextInput
                  value={city}
                  onChangeText={setCity}
                  className="w-full bg-white rounded-[20px] px-5 py-[18px] text-kosh-textMain font-bold text-[17px] border border-kosh-border"
                />
              </View>
            </View>
          </View>
          <TouchableOpacity
            onPress={handleCreate}
            disabled={!name || loading}
            className="w-full bg-kosh-primary py-[18px] rounded-full items-center"
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="white" />
              : <Text className="text-white font-bold text-[17px]">Create Workspace</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
