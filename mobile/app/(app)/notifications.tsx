import { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft, AlertCircle, AlertTriangle, Package } from "lucide-react-native";
import { useAuth } from "../../lib/auth-context";
import { getInventory } from "../../lib/api";
import { colors } from "../../components/ui";

export default function NotificationsScreen() {
  const { auth } = useAuth();
  const [urgentItems, setUrgentItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.token) return;
    (async () => {
      try {
        const data = await getInventory(auth.token!);
        setUrgentItems(data.filter(i => {
          const s = i.status.toLowerCase();
          return s === "critical" || s.includes("out");
        }));
      } catch {}
      finally { setLoading(false); }
    })();
  }, [auth.token]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F7F8" }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}>
          <ChevronLeft size={24} color={colors.textMain} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        <Text style={{ fontSize: 36, fontWeight: "800", color: colors.textMain, letterSpacing: -1, marginBottom: 24 }}>Alerts</Text>

        {loading ? (
          <View style={{ paddingTop: 60, alignItems: "center" }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : urgentItems.length === 0 ? (
          <View style={{ backgroundColor: colors.card, borderRadius: 28, borderWidth: 1, borderColor: colors.border, padding: 48, alignItems: "center" }}>
            <View style={{ width: 64, height: 64, backgroundColor: "#ECFDF5", borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <Package size={32} color="#059669" strokeWidth={2} />
            </View>
            <Text style={{ fontSize: 17, fontWeight: "800", color: colors.textMain, marginBottom: 8 }}>All clear!</Text>
            <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: "600", textAlign: "center" }}>No urgent items need your attention right now.</Text>
          </View>
        ) : (
          <View style={{ backgroundColor: colors.card, borderRadius: 28, borderWidth: 1, borderColor: colors.border, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 20, elevation: 2 }}>
            {urgentItems.map((item, idx) => {
              const isOut = item.quantity === 0;
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => router.push({ pathname: "/(app)/item-detail", params: { itemJson: JSON.stringify(item) } })}
                  activeOpacity={0.7}
                  style={{ padding: 20, borderBottomWidth: idx < urgentItems.length - 1 ? 1 : 0, borderBottomColor: colors.border, flexDirection: "row", alignItems: "center", gap: 16 }}
                >
                  <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: isOut ? "#FEF2F2" : "#FFF7ED", alignItems: "center", justifyContent: "center" }}>
                    {isOut ? <AlertCircle size={22} color="#DC2626" strokeWidth={2} /> : <AlertTriangle size={22} color="#EA580C" strokeWidth={2} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: "800", color: colors.textMain, marginBottom: 4, letterSpacing: -0.2 }}>
                      {item.name} {isOut ? "requires replenishment" : "running low"}
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: isOut ? "#DC2626" : "#EA580C" }}>
                      {isOut ? "Currently out of stock" : `${parseFloat(item.quantity.toFixed(2))} ${item.unit} remaining`}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
