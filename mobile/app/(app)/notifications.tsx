import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput } from "react-native";
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
  const [packSizeModal, setPackSizeModal] = useState<{ isOpen: boolean; item: ConfirmationItem | null; packSizeText: string; packUnitText: string }>({ isOpen: false, item: null, packSizeText: "", packUnitText: "kg" });

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

  const performResolve = async (id: string, action: "same" | "different" | "pack_size", pack_size?: number, pack_unit?: string) => {
    if (!auth.token) return;
    setResolvingId(id);
    setPackSizeModal(prev => ({ ...prev, isOpen: false }));
    try {
      const res = await resolveConfirmation(auth.token, id, action, pack_size, pack_unit) as any;
      if (res.next_step === "review") {
        Alert.alert("Pack Size Saved", "The pack size was saved, but the item identity now needs your review.");
      }
      await loadData();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to resolve item");
    } finally {
      setResolvingId(null);
    }
  };

  const handleTapConfirmation = (item: ConfirmationItem) => {
    if (item.source === "purchase_pack_size") {
      setPackSizeModal({ isOpen: true, item, packSizeText: "", packUnitText: "kg" });
      return;
    }

    const matchPct = Math.round(item.score * 100);
    const reasonText = item.ai_match_reason ? `\n\nFlag Reason:\n${item.ai_match_reason}` : "";
    Alert.alert(
      "Resolve Item Match",
      `Extracted: "${item.extracted_name}"\nExisting: "${item.candidate_name}" (${matchPct}% match)\nQuantity: ${formatForDisplay(item.quantity, item.unit)}${reasonText}\n\nIs this the same inventory item?`,
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
        <TouchableOpacity onPress={() => router.navigate("/(app)/(tabs)/home" as any)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}>
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
                            {conf.source === "purchase_pack_size" ? `Specify Pack Size: ${conf.extracted_name}` : `Extracted: ${conf.extracted_name} → Existing: ${conf.candidate_name} (${matchPct}% match)`}
                          </Text>
                          <Text style={{ fontSize: 13, fontWeight: "700", color: "#A16207" }}>
                            {conf.source === "purchase_pack_size" ? `${conf.quantity} ${conf.unit} scanned • Tap to enter pack size` : `${formatForDisplay(conf.quantity, conf.unit)} • Tap to resolve`}
                          </Text>
                          {conf.ai_match_reason && (
                            <Text style={{ fontSize: 12, color: "#DC2626", marginTop: 4, fontWeight: "600" }}>
                              {conf.ai_match_reason}
                            </Text>
                          )}
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
      
      {/* Pack Size Modal */}
      <Modal visible={packSizeModal.isOpen} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 }}>
          <View style={{ backgroundColor: colors.card, borderRadius: 24, padding: 24 }}>
            <Text style={{ fontSize: 20, fontWeight: "800", color: colors.textMain, marginBottom: 8 }}>Pack Size Required</Text>
            <Text style={{ fontSize: 15, color: colors.textMuted, marginBottom: 20, lineHeight: 22 }}>
              How much is in one {packSizeModal.item?.unit} of {packSizeModal.item?.extracted_name}?
            </Text>
            
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
              <TextInput
                style={{ flex: 1, backgroundColor: "#F3F4F6", borderRadius: 12, padding: 16, fontSize: 17, color: colors.textMain, fontWeight: "600" }}
                keyboardType="numeric"
                placeholder="E.g. 25"
                placeholderTextColor="#9CA3AF"
                value={packSizeModal.packSizeText}
                onChangeText={t => setPackSizeModal(prev => ({ ...prev, packSizeText: t }))}
              />
              <View style={{ width: 100, backgroundColor: "#F3F4F6", borderRadius: 12, overflow: "hidden" }}>
                <TextInput
                  style={{ flex: 1, padding: 16, fontSize: 17, color: colors.textMain, fontWeight: "600", textAlign: "center" }}
                  placeholder="Unit (kg/L)"
                  placeholderTextColor="#9CA3AF"
                  value={packSizeModal.packUnitText}
                  onChangeText={t => setPackSizeModal(prev => ({ ...prev, packUnitText: t }))}
                />
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => setPackSizeModal(prev => ({ ...prev, isOpen: false }))}
                style={{ flex: 1, padding: 16, borderRadius: 12, backgroundColor: "#F3F4F6", alignItems: "center" }}
              >
                <Text style={{ fontSize: 16, fontWeight: "700", color: colors.textMain }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const size = parseFloat(packSizeModal.packSizeText);
                  const unit = packSizeModal.packUnitText.trim();
                  if (isNaN(size) || size <= 0 || !unit) {
                    Alert.alert("Invalid Input", "Please enter a valid number and unit.");
                    return;
                  }
                  performResolve(packSizeModal.item!.id, "pack_size", size, unit);
                }}
                style={{ flex: 1, padding: 16, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center" }}
              >
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFF" }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

