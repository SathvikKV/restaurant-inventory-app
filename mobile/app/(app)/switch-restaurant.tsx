import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft, Store, CheckCircle2 } from "lucide-react-native";
import { colors } from "../../components/ui";
import { useAuth } from "../../lib/auth-context";
import { saveAuth } from "../../lib/auth-store";
import { listRestaurants, selectRestaurant } from "../../lib/api";
import { resetStackAndNavigate } from "../../lib/nav";

export default function SwitchRestaurantScreen() {
  const { auth } = useAuth();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.token) return;
    (async () => {
      try {
        const res = await listRestaurants(auth.token!);
        setRestaurants(res);
      } catch (err: any) {
        Alert.alert("Error", err.message || "Failed to load restaurants");
      } finally {
        setLoading(false);
      }
    })();
  }, [auth.token]);

  async function handleSwitch(id: string) {
    if (!auth.token || switching) return;
    setSwitching(id);
    try {
      const res = await selectRestaurant(auth.token, id);
      await saveAuth({
        ...auth,
        token: res.access_token,
        role: res.role || auth.role || "manager", // Fallback to current if missing
        schema: res.schema,
        tenantId: res.tenant_id,
        restaurantName: (res as any).restaurant_name || "",
        needsRestaurantSelection: false,
        viewMode: undefined, // Reset view mode on switch
      });
      // The auth context will update and redirect to the appropriate app screen.
      // But we can forcibly reset the stack to home for a clean state.
      resetStackAndNavigate("/(app)/(tabs)/home");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to switch restaurant");
      setSwitching(null);
    }
  }

  const showBack = !auth.needsRestaurantSelection;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F7F8" }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>
        {showBack && (
          <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}>
            <ChevronLeft size={24} color={colors.textMain} />
          </TouchableOpacity>
        )}
        <Text style={{ fontSize: 17, fontWeight: "800", color: colors.textMain, marginLeft: showBack ? 12 : 24 }}>Switch Restaurant</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40, gap: 16 }}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : restaurants.length === 0 ? (
          <Text style={{ textAlign: "center", color: colors.textMuted, marginTop: 40 }}>You don't belong to any restaurants yet.</Text>
        ) : (
          restaurants.map(r => {
            const isActive = auth.schema === r.schema_name;
            const isSwitchingThis = switching === r.id;

            return (
              <TouchableOpacity
                key={r.id}
                disabled={isActive || !!switching}
                onPress={() => handleSwitch(r.id)}
                style={{
                  backgroundColor: "white",
                  borderRadius: 24,
                  borderWidth: 1,
                  borderColor: isActive ? colors.primary : colors.border,
                  padding: 20,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  opacity: (!!switching && !isSwitchingThis) ? 0.5 : 1,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 16, flex: 1 }}>
                  <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: isActive ? "#E8F0EC" : "#F4F5F7", alignItems: "center", justifyContent: "center" }}>
                    <Store size={24} color={isActive ? colors.primary : colors.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 17, fontWeight: "800", color: colors.textMain }}>{r.name}</Text>
                    <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>
                      {isActive ? "Currently Active" : "Tap to switch"}
                    </Text>
                  </View>
                </View>
                
                {isActive ? (
                  <CheckCircle2 size={24} color={colors.primary} />
                ) : isSwitchingThis ? (
                  <ActivityIndicator color={colors.primary} />
                ) : null}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
