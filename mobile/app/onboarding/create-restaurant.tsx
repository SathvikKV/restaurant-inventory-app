import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft, User, MapPin, ChevronDown } from "lucide-react-native";
import { createRestaurant, selectRestaurant } from "../../lib/api";
import { saveAuth, loadAuth } from "../../lib/auth-store";
import { colors } from "../../components/ui";

export default function CreateRestaurantScreen() {
  const [name, setName] = useState("");
  const [branch, setBranch] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const auth = loadAuth();
      if (!auth.token) throw new Error("Not authenticated");
      const restaurant = await createRestaurant(auth.token, name.trim(), branch.trim() || undefined);
      const selected = await selectRestaurant(auth.token, restaurant.id);
      saveAuth({
        ...auth,
        token: selected.access_token,
        tenantId: restaurant.id,
        schema: selected.schema,
        restaurantName: selected.restaurant_name,
        needsRestaurantSelection: false,
      });
      router.push("/onboarding/connect-team");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 48, justifyContent: "space-between" }}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 24, marginLeft: -12 }}
            >
              <ChevronLeft size={24} color={colors.textMain} strokeWidth={2} />
            </TouchableOpacity>

            <Text style={{ fontSize: 28, fontWeight: "800", color: colors.textMain, textAlign: "center", letterSpacing: -0.5, lineHeight: 36, marginBottom: 12 }}>
              Let's set up your{"\n"}restaurant
            </Text>
            <Text style={{ fontSize: 15, color: colors.textMuted, fontWeight: "600", textAlign: "center", lineHeight: 22, marginBottom: 40, maxWidth: 240, alignSelf: "center" }}>
              This helps SANQ personalize your experience.
            </Text>

            <View style={{ gap: 12 }}>
              {/* Restaurant Name */}
              <View style={{ backgroundColor: "white", borderRadius: 24, paddingHorizontal: 20, paddingVertical: 16, flexDirection: "row", alignItems: "center", gap: 16, borderWidth: 1, borderColor: colors.border, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 20, elevation: 1 }}>
                <User size={20} color={colors.textMuted} strokeWidth={2} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textMuted, marginBottom: 2 }}>Restaurant Name</Text>
                  <TextInput value={name} onChangeText={setName} placeholder="Spice Garden" placeholderTextColor={colors.textMuted} autoFocus style={{ fontSize: 15, fontWeight: "800", color: colors.textMain, padding: 0 }} />
                </View>
              </View>

              {/* Cuisine */}
              <TouchableOpacity style={{ backgroundColor: "white", borderRadius: 24, paddingHorizontal: 20, paddingVertical: 16, flexDirection: "row", alignItems: "center", gap: 16, borderWidth: 1, borderColor: colors.border, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 20, elevation: 1 }}>
                <ChevronDown size={20} color={colors.textMuted} strokeWidth={2} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textMuted, marginBottom: 2 }}>Cuisine</Text>
                  <Text style={{ fontSize: 15, fontWeight: "800", color: colors.textMain }}>North Indian</Text>
                </View>
                <ChevronDown size={18} color={colors.textMuted} strokeWidth={2} />
              </TouchableOpacity>

              {/* Branch */}
              <View style={{ backgroundColor: "white", borderRadius: 24, paddingHorizontal: 20, paddingVertical: 16, flexDirection: "row", alignItems: "center", gap: 16, borderWidth: 1, borderColor: colors.border, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 20, elevation: 1 }}>
                <MapPin size={20} color={colors.textMuted} strokeWidth={2} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textMuted, marginBottom: 2 }}>Branch Name (Optional)</Text>
                  <TextInput value={branch} onChangeText={setBranch} placeholder="Koramangala, Bengaluru" placeholderTextColor={colors.textMuted} style={{ fontSize: 15, fontWeight: "800", color: colors.textMain, padding: 0 }} />
                </View>
              </View>
            </View>
          </ScrollView>

          <TouchableOpacity
            onPress={handleContinue}
            disabled={!name.trim() || loading}
            activeOpacity={0.85}
            style={{ backgroundColor: !name.trim() ? "#A0ADB4" : colors.primary, borderRadius: 24, paddingVertical: 18, alignItems: "center", marginTop: 24, shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: !name.trim() ? 0 : 0.3, shadowRadius: 20, elevation: !name.trim() ? 0 : 4 }}
          >
            <Text style={{ color: "white", fontSize: 17, fontWeight: "800", letterSpacing: -0.3 }}>{loading ? "Creating..." : "Continue"}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
