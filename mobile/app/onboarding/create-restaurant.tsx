import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft, User, MapPin, ChevronDown } from "lucide-react-native";
import { createRestaurant, selectRestaurant, listRestaurants } from "../../lib/api";
import { saveAuth, loadAuth } from "../../lib/auth-store";
import { colors } from "../../components/ui";

export default function CreateRestaurantScreen() {
  const [name, setName] = useState("");
  const [branch, setBranch] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [existingRestaurants, setExistingRestaurants] = useState<any[]>([]);
  const [isBranchMode, setIsBranchMode] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState("");

  import { useEffect } from "react";
  useEffect(() => {
    async function fetchExisting() {
      const auth = loadAuth();
      if (!auth.token) return;
      try {
        const res = await listRestaurants(auth.token);
        setExistingRestaurants(res);
        if (res.length > 0) {
          setSelectedParentId(res[0].id);
        }
      } catch (e) {
        console.warn("Failed to load existing restaurants", e);
      }
    }
    fetchExisting();
  }, []);

  async function handleContinue() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const auth = loadAuth();
      if (!auth.token) throw new Error("Not authenticated");
      const restaurant = await createRestaurant(
        auth.token, 
        name.trim(), 
        branch.trim() || undefined, 
        isBranchMode ? selectedParentId : undefined
      );
      const selected = await selectRestaurant(auth.token, restaurant.id);
      await saveAuth({
        ...auth,
        token: selected.access_token,
        tenantId: restaurant.id,
        schema: selected.schema,
        restaurantName: selected.restaurant_name,
        role: selected.role || "owner",
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
              {existingRestaurants.length > 0 && (
                <View style={{ backgroundColor: "#F4F5F7", borderRadius: 16, padding: 4, flexDirection: "row", marginBottom: 8 }}>
                  <TouchableOpacity
                    onPress={() => setIsBranchMode(false)}
                    style={{ flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: 12, backgroundColor: !isBranchMode ? "white" : "transparent", shadowColor: !isBranchMode ? "#000" : "transparent", shadowOffset: { width: 0, height: 2 }, shadowOpacity: !isBranchMode ? 0.05 : 0, shadowRadius: 4, elevation: !isBranchMode ? 2 : 0 }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "800", color: !isBranchMode ? colors.textMain : colors.textMuted }}>New Independent</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setIsBranchMode(true)}
                    style={{ flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: 12, backgroundColor: isBranchMode ? "white" : "transparent", shadowColor: isBranchMode ? "#000" : "transparent", shadowOffset: { width: 0, height: 2 }, shadowOpacity: isBranchMode ? 0.05 : 0, shadowRadius: 4, elevation: isBranchMode ? 2 : 0 }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "800", color: isBranchMode ? colors.textMain : colors.textMuted }}>New Branch</Text>
                  </TouchableOpacity>
                </View>
              )}

              {isBranchMode && existingRestaurants.length > 0 && (
                <View style={{ backgroundColor: "white", borderRadius: 24, paddingHorizontal: 20, paddingVertical: 16, flexDirection: "row", alignItems: "center", gap: 16, borderWidth: 1, borderColor: colors.border }}>
                  <User size={20} color={colors.textMuted} strokeWidth={2} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textMuted, marginBottom: 2 }}>Parent Restaurant</Text>
                    <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                      {existingRestaurants.map(r => (
                        <TouchableOpacity 
                          key={r.id} 
                          onPress={() => setSelectedParentId(r.id)}
                          style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: selectedParentId === r.id ? colors.primary : "#F4F5F7" }}
                        >
                          <Text style={{ fontSize: 13, fontWeight: "800", color: selectedParentId === r.id ? "white" : colors.textMain }}>{r.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              )}

              {/* Restaurant Name */}
              <View style={{ backgroundColor: "white", borderRadius: 24, paddingHorizontal: 20, paddingVertical: 16, flexDirection: "row", alignItems: "center", gap: 16, borderWidth: 1, borderColor: colors.border, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 20, elevation: 1 }}>
                <User size={20} color={colors.textMuted} strokeWidth={2} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textMuted, marginBottom: 2 }}>
                    {isBranchMode ? "Branch/Location Name" : "Restaurant Name"}
                  </Text>
                  <TextInput value={name} onChangeText={setName} placeholder={isBranchMode ? "e.g. Begumpet" : "e.g. Joe's Diner"} placeholderTextColor={colors.textMuted} autoFocus style={{ fontSize: 15, fontWeight: "800", color: colors.textMain, padding: 0 }} />
                </View>
              </View>


              {!isBranchMode && (
                <View style={{ backgroundColor: "white", borderRadius: 24, paddingHorizontal: 20, paddingVertical: 16, flexDirection: "row", alignItems: "center", gap: 16, borderWidth: 1, borderColor: colors.border, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 20, elevation: 1 }}>
                  <MapPin size={20} color={colors.textMuted} strokeWidth={2} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textMuted, marginBottom: 2 }}>Branch Name (Optional)</Text>
                    <TextInput value={branch} onChangeText={setBranch} placeholder="e.g. Downtown" placeholderTextColor={colors.textMuted} style={{ fontSize: 15, fontWeight: "800", color: colors.textMain, padding: 0 }} />
                  </View>
                </View>
              )}
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
