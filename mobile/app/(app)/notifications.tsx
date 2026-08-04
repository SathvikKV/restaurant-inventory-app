import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft, AlertCircle, AlertTriangle, Package, HelpCircle } from "lucide-react-native";
import { useAuth } from "../../lib/auth-context";
import { getInventory, listConfirmations, resolveConfirmation, ConfirmationItem } from "../../lib/api";
import { colors } from "../../components/ui";
import { formatForDisplay } from "../../lib/units";

export default function NotificationsScreen() {
  const { auth } = useAuth();
  const [urgentItems, setUrgentItems] = useState<any[]>([]);
  const [confirmations, setConfirmations] = useState<ConfirmationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!auth.token) return;
    setLoading(true);
    try {
      const [invData, confData] = await Promise.all([
        getInventory(auth.token),
        listConfirmations(auth.token).catch(() => []),
      ]);
      setUrgentItems(invData.filter(i => {
        const s = i.status.toLowerCase();
        return s === "critical" || s.includes("out");
      }));
      setConfirmations(confData || []);
    } catch {}
    finally { setLoading(false); }
  }, [auth.token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const performResolve = async (id: string, action: "same" | "different") => {
    if (!auth.token) return;
    setResolvingId(id);
    try {
      await resolveConfirmation(auth.token, id, action);
      await loadData();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to resolve item match");
    } finally {
      setResolvingId(null);
    }
  };

  const handleTapConfirmation = (item: ConfirmationItem) => {
    const matchPct = Math.round(item.score * 100);
    Alert.alert(
      "Resolve Item Match",
      `Extracted: "${item.extracted_name}"\nExisting: "${item.candidate_name}" (${matchPct}% match)\nQuantity: ${formatForDisplay(item.quantity, item.unit)}\n\nIs this the same inventory item?`,
      [
        { text: "Same item", onPress: () => performResolve(item.id, "same") },
        { text: "Different item", onPress: () => performResolve(item.id, "different"), style: "destructive" },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F7F8" }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>
        <TouchableOpacity onPress={() => router.navigate("/(app)/home" as any)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}>
          <ChevronLeft size={24} color={colors.textMain} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        <Text style={{ fontSize: 36, fontWeight: "800", color: colors.textMain, letterSpacing: -1, marginBottom: 24 }}>Alerts</Text>

        {loading ? (
          <View style={{ paddingTop: 60, alignItems: "center" }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : confirmations.length === 0 && urgentItems.length === 0 ? (
          <View style={{ backgroundColor: colors.card, borderRadius: 28, borderWidth: 1, borderColor: colors.border, padding: 48, alignItems: "center" }}>
            <View style={{ width: 64, height: 64, backgroundColor: "#ECFDF5", borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <Package size={32} color="#059669" strokeWidth={2} />
            </View>
            <Text style={{ fontSize: 17, fontWeight: "800", color: colors.textMain, marginBottom: 8 }}>All clear!</Text>
            <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: "600", textAlign: "center" }}>No urgent items or confirmations need your attention right now.</Text>
          </View>
        ) : (
          <>
            {/* ── Needs Review Section ── */}
            {confirmations.length > 0 && (
              <View style={{ marginBottom: 32 }}>
                <Text style={{ fontSize: 20, fontWeight: "800", color: colors.textMain, letterSpacing: -0.5, marginBottom: 16 }}>Needs Review</Text>
                <View style={{ backgroundColor: colors.card, borderRadius: 28, borderWidth: 1, borderColor: colors.border, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 20, elevation: 2 }}>
                  {confirmations.map((conf, idx) => {
                    const matchPct = Math.round(conf.score * 100);
                    const isResolving = resolvingId === conf.id;
                    return (
                      <TouchableOpacity
                        key={conf.id}
                        disabled={isResolving}
                        onPress={() => handleTapConfirmation(conf)}
                        activeOpacity={0.7}
                        style={{ padding: 20, borderBottomWidth: idx < confirmations.length - 1 ? 1 : 0, borderBottomColor: colors.border, flexDirection: "row", alignItems: "center", gap: 16 }}
                      >
                        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: "#FEFCE8", alignItems: "center", justifyContent: "center" }}>
                          <HelpCircle size={22} color="#A16207" strokeWidth={2} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 15, fontWeight: "800", color: colors.textMain, marginBottom: 4, letterSpacing: -0.2 }}>
                            Extracted: {conf.extracted_name} → Existing: {conf.candidate_name} ({matchPct}% match)
                          </Text>
                          <Text style={{ fontSize: 13, fontWeight: "700", color: "#A16207" }}>
                            {formatForDisplay(conf.quantity, conf.unit)} • Tap to resolve
                          </Text>
                        </View>
                        {isResolving && <ActivityIndicator size="small" color={colors.primary} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ── Low Stock Alerts ── */}
            {urgentItems.length > 0 && (
              <View>
                {confirmations.length > 0 && (
                  <Text style={{ fontSize: 20, fontWeight: "800", color: colors.textMain, letterSpacing: -0.5, marginBottom: 16 }}>Low Stock Alerts</Text>
                )}
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
                            {isOut ? "Currently out of stock" : `${formatForDisplay(item.quantity, item.unit)} remaining`}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

