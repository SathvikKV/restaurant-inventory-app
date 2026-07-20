import { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Bell, Scan, PenLine, ArrowDownToLine, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react-native";
import { useAuth } from "../../lib/auth-context";
import { getInventoryHealth, getInventory, getAuditLog, getMe } from "../../lib/api";
import { MiseLogo, colors, Card } from "../../components/ui";

type HealthData = { score: number; critical: number; low: number; healthy: number; total: number };
type InventoryItem = { id: string; name: string; unit: string; quantity: number; status: string };
type AuditEntry = { id?: string; description?: string; recorded_by?: string; created_at?: string; type?: string };

export default function HomeScreen() {
  const { auth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<HealthData>({ score: 0, critical: 0, low: 0, healthy: 0, total: 0 });
  const [urgentItems, setUrgentItems] = useState<InventoryItem[]>([]);
  const [activities, setActivities] = useState<AuditEntry[]>([]);
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    if (!auth.token) return;
    (async () => {
      setLoading(true);
      try {
        const [h, inv, audit, me] = await Promise.allSettled([
          getInventoryHealth(auth.token!),
          getInventory(auth.token!),
          getAuditLog(auth.token!, 4),
          getMe(auth.token!),
        ]);
        if (h.status === "fulfilled") setHealth(h.value);
        if (inv.status === "fulfilled") {
          setUrgentItems(inv.value.filter(i => {
            const s = i.status.toLowerCase();
            return s === "critical" || s === "out_of_stock" || s === "out of stock";
          }));
        }
        if (audit.status === "fulfilled") setActivities(audit.value.entries || []);
        if (me.status === "fulfilled" && me.value?.name) {
          setUserName(me.value.name.split(" ")[0]);
        } else {
          setUserName((auth.restaurantName || "Minerva Coffee Shop").split(" ")[0]);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [auth.token]);

  const restaurantName = auth.restaurantName || "Minerva Coffee Shop";
  const score = health.score;
  const badgeLabel = score >= 80 ? "Healthy" : "Needs Work";
  const badgeBg = score >= 80 ? "#ECFDF5" : score >= 50 ? "#FFF7ED" : "#FEF2F2";
  const badgeText = score >= 80 ? "#065F46" : score >= 50 ? "#9A3412" : "#991B1B";

  const quickActions = [
    { label: "Receive", icon: Scan, route: "/(app)/scan-invoice", color: colors.textMain },
    { label: "Adjust", icon: PenLine, route: "/(app)/inventory", color: colors.textMain },
    { label: "Issue", icon: ArrowDownToLine, route: "/(app)/inventory", color: colors.textMain },
    { label: "Waste", icon: AlertTriangle, route: "/(app)/inventory", color: "#EF4444" },
  ];

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F7F8", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F7F8" }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40 }}
      >

        {/* ── Header ── */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 40 }}>
          <View>
            <MiseLogo size="header" />
            <Text style={{ fontSize: 32, fontWeight: "800", letterSpacing: -1, color: colors.textMain, marginTop: 8, marginBottom: 4 }}>
              Good morning,{"\n"}{userName}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.textMuted }}>{restaurantName}</Text>
              <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.textMuted }}>Hyderabad</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/(app)/notifications")}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: "center",
              justifyContent: "center",
              marginTop: 40,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.03,
              shadowRadius: 20,
              elevation: 2,
            }}
          >
            <Bell size={22} color={colors.textMain} strokeWidth={2} />
            {urgentItems.length > 0 && (
              <View style={{
                position: "absolute",
                top: 10,
                right: 10,
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: "#EF4444",
                borderWidth: 2,
                borderColor: "white",
              }} />
            )}
          </TouchableOpacity>
        </View>

        {/* ── Needs Attention ── */}
        {urgentItems.length > 0 && (
          <View style={{ marginBottom: 40 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16, paddingHorizontal: 4 }}>
              <Text style={{ fontSize: 17, fontWeight: "800", color: colors.textMain, letterSpacing: -0.3 }}>Needs Attention</Text>
              {urgentItems.length > 3 && (
                <TouchableOpacity onPress={() => router.push("/(app)/notifications")}>
                  <Text style={{ fontSize: 13, fontWeight: "800", color: colors.primary }}>See all {urgentItems.length}</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={{
              backgroundColor: colors.card,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 8,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.03,
              shadowRadius: 20,
              elevation: 2,
            }}>
              {urgentItems.slice(0, 3).map((item) => {
                const isOut = item.quantity === 0;
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => router.push({ pathname: "/(app)/item-detail", params: { itemJson: JSON.stringify(item) } })}
                    activeOpacity={0.7}
                    style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderRadius: 20 }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 16, flex: 1 }}>
                      <View style={{
                        width: 48,
                        height: 48,
                        borderRadius: 16,
                        backgroundColor: isOut ? "#FEF2F2" : "#FFF7ED",
                        alignItems: "center",
                        justifyContent: "center",
                      }}>
                        <AlertTriangle size={22} color={isOut ? "#DC2626" : "#EA580C"} strokeWidth={2} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: "800", color: colors.textMain, letterSpacing: -0.2, marginBottom: 3 }}>{item.name}</Text>
                        <Text style={{ fontSize: 13, fontWeight: "700", color: isOut ? "#DC2626" : "#EA580C" }}>
                          {isOut ? "Currently out of stock" : `${parseFloat(item.quantity.toFixed(2))} ${item.unit} remaining`}
                        </Text>
                      </View>
                    </View>
                    <ChevronRight size={20} color={colors.textMuted} strokeWidth={2} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Inventory Health ── */}
        <TouchableOpacity
          onPress={() => router.push("/(app)/inventory")}
          activeOpacity={0.95}
          style={{
            backgroundColor: colors.card,
            borderRadius: 28,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 28,
            overflow: "hidden",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.05,
            shadowRadius: 40,
            elevation: 3,
            marginBottom: 40,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <View>
              <Text style={{ fontSize: 11, fontWeight: "800", color: colors.textMuted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Inventory Health</Text>
              <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4 }}>
                <Text style={{ fontSize: 56, fontWeight: "800", color: colors.textMain, lineHeight: 56 }}>{score}</Text>
                <Text style={{ fontSize: 20, fontWeight: "800", color: colors.textMuted, marginBottom: 4 }}>/100</Text>
              </View>
            </View>
            <View style={{ backgroundColor: badgeBg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: "800", color: badgeText, letterSpacing: 0.5 }}>{badgeLabel}</Text>
            </View>
          </View>
          {(health.critical > 0 || health.low > 0) && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {health.critical > 0 && (
                <View style={{ backgroundColor: "#FFF7ED", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: "800", color: "#C2410C" }}>{health.critical} Critical</Text>
                </View>
              )}
              {health.low > 0 && (
                <View style={{ backgroundColor: "#FEFCE8", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: "800", color: "#A16207" }}>{health.low} Low</Text>
                </View>
              )}
              {health.healthy > 0 && (
                <View style={{ backgroundColor: "#ECFDF5", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: "800", color: "#065F46" }}>{health.healthy} Healthy</Text>
                </View>
              )}
            </View>
          )}
          {/* Decorative line */}
          <View style={{ marginTop: 20, opacity: 0.15 }}>
            <View style={{ height: 2, backgroundColor: colors.primary, borderRadius: 1, width: "70%" }} />
            <View style={{ height: 2, backgroundColor: colors.primary, borderRadius: 1, width: "85%", marginTop: 6, opacity: 0.6 }} />
          </View>
        </TouchableOpacity>

        {/* ── Today's Overview ── */}
        <View style={{ marginBottom: 40 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingHorizontal: 4 }}>
            <Text style={{ fontSize: 17, fontWeight: "800", color: colors.textMain, letterSpacing: -0.3 }}>Today's Overview</Text>
            <TouchableOpacity style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 12,
            }}>
              <Text style={{ fontSize: 12, fontWeight: "800", color: colors.textMain }}>Today</Text>
              <ChevronDown size={14} color={colors.textMuted} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <View style={{
            backgroundColor: colors.card,
            borderRadius: 28,
            borderWidth: 1,
            borderColor: colors.border,
            paddingVertical: 24,
            paddingHorizontal: 24,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.03,
            shadowRadius: 20,
            elevation: 2,
          }}>
            <View style={{ gap: 10 }}>
              <Text style={{ fontSize: 11, fontWeight: "800", color: colors.textMuted, letterSpacing: 2, textTransform: "uppercase" }}>Purchases</Text>
              <Text style={{ fontSize: 18, fontWeight: "800", color: colors.textMain, letterSpacing: -0.3 }}>₹42.3k</Text>
            </View>
            <View style={{ width: 1, height: 40, backgroundColor: colors.border }} />
            <View style={{ gap: 10, alignItems: "center" }}>
              <Text style={{ fontSize: 11, fontWeight: "800", color: colors.textMuted, letterSpacing: 2, textTransform: "uppercase" }}>Consumption</Text>
              <Text style={{ fontSize: 18, fontWeight: "800", color: colors.textMain, letterSpacing: -0.3 }}>₹31.4k</Text>
            </View>
            <View style={{ width: 1, height: 40, backgroundColor: colors.border }} />
            <View style={{ gap: 10, alignItems: "flex-end" }}>
              <Text style={{ fontSize: 11, fontWeight: "800", color: colors.textMuted, letterSpacing: 2, textTransform: "uppercase" }}>Sales</Text>
              <Text style={{ fontSize: 18, fontWeight: "800", color: "#059669", letterSpacing: -0.3 }}>₹1.1L</Text>
            </View>
          </View>
        </View>

        {/* ── Quick Actions ── */}
        <View style={{ marginBottom: 40 }}>
          <Text style={{ fontSize: 17, fontWeight: "800", color: colors.textMain, marginBottom: 16, paddingHorizontal: 4, letterSpacing: -0.3 }}>Quick Actions</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            {quickActions.map(({ label, icon: ActionIcon, route, color }) => (
              <TouchableOpacity
                key={label}
                onPress={() => router.push(route as any)}
                activeOpacity={0.8}
                style={{ alignItems: "center", gap: 10, flex: 1 }}
              >
                <View style={{
                  width: 64,
                  height: 64,
                  backgroundColor: colors.card,
                  borderRadius: 22,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.03,
                  shadowRadius: 20,
                  elevation: 2,
                }}>
                  <ActionIcon size={26} color={color} strokeWidth={2} />
                </View>
                <Text style={{ fontSize: 13, fontWeight: "800", color: colors.textMuted, letterSpacing: -0.2 }}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Recent Activity ── */}
        <View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingHorizontal: 4 }}>
            <Text style={{ fontSize: 17, fontWeight: "800", color: colors.textMain, letterSpacing: -0.3 }}>Recent Activity</Text>
            {activities.length > 0 && (
              <TouchableOpacity onPress={() => router.push("/(app)/activity-history")}>
                <Text style={{ fontSize: 13, fontWeight: "800", color: colors.primary }}>View feed</Text>
              </TouchableOpacity>
            )}
          </View>
          {activities.length === 0 ? (
            <View style={{
              backgroundColor: colors.card,
              borderRadius: 28,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 32,
              alignItems: "center",
            }}>
              <Text style={{ fontSize: 15, fontWeight: "800", color: colors.textMain, marginBottom: 4 }}>No activity today.</Text>
              <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: "600", textAlign: "center" }}>Operations will appear here as your team works.</Text>
            </View>
          ) : (
            <View style={{
              backgroundColor: colors.card,
              borderRadius: 28,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 24,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.03,
              shadowRadius: 20,
              elevation: 2,
            }}>
              {activities.slice(0, 4).map((act, idx, arr) => (
                <View key={act.id || idx} style={{ flexDirection: "row", gap: 20, marginBottom: idx < arr.length - 1 ? 28 : 0 }}>
                  {idx < arr.length - 1 && (
                    <View style={{ position: "absolute", left: 7, top: 20, width: 2, height: "100%", backgroundColor: colors.border }} />
                  )}
                  <View style={{
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: colors.card,
                    borderWidth: 3,
                    borderColor: colors.primary,
                    marginTop: 2,
                    zIndex: 1,
                  }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: "800", color: colors.textMain, lineHeight: 20, marginBottom: 6, letterSpacing: -0.2 }}>
                      {act.description || `${act.type || "Activity"} recorded`}
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>
                      {act.created_at ? new Date(act.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"} • {act.recorded_by || "Staff"}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
