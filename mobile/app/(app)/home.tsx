import { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../lib/auth-context";
import { getInventoryHealth, getAIRecommendations, getInventory } from "../../lib/api";

type HealthData = { score: number; label: string; critical: number; low: number; healthy: number; total: number };
type Recommendation = { id: string; title: string; reason: string; item: string; current_qty: number; unit: string };
type InventoryItem = { id: string; name: string; unit: string; quantity: number; category: string | null; status: string };

function getStatusColor(status: string): string {
  const s = status.toLowerCase();
  if (s === "out_of_stock" || s === "out of stock") return "#EF4444";
  if (s === "critical") return "#F97316";
  if (s === "low") return "#EAB308";
  return "#22C55E";
}

function isUrgent(status: string) {
  const s = status.toLowerCase();
  return s === "critical" || s === "out_of_stock" || s === "out of stock";
}

function OwnerHome({ health, recs, urgentItems }: { health: HealthData; recs: Recommendation[]; urgentItems: InventoryItem[] }) {
  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="px-5 pt-4 pb-6">

        {/* Header */}
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-[13px] text-kosh-textMuted font-medium">Good Morning,</Text>
            <Text className="text-[24px] font-bold text-kosh-textMain">Welcome 👋</Text>
          </View>
          <TouchableOpacity className="w-10 h-10 bg-white rounded-full items-center justify-center border border-kosh-border">
            <Text className="text-lg">🔔</Text>
          </TouchableOpacity>
        </View>

        {/* Health Score Card */}
        <View className="bg-kosh-primary rounded-3xl p-5 mb-4">
          <View className="flex-row justify-between items-center">
            <View className="flex-1">
              <Text className="text-white text-[13px] font-medium mb-1" style={{ opacity: 0.7 }}>Inventory Health</Text>
              <Text className="text-white text-[40px] font-bold" style={{ lineHeight: 44 }}>{health.score}</Text>
              <Text className="text-white text-[13px] mt-1" style={{ opacity: 0.7 }}>out of 100</Text>
            </View>
            <View className="w-20 h-20 rounded-full items-center justify-center" style={{ borderWidth: 4, borderColor: "rgba(255,255,255,0.2)" }}>
              <Text className="text-white text-[28px] font-bold">{health.score}</Text>
            </View>
          </View>
          <View className="mt-4 pt-4" style={{ borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.2)" }}>
            <Text className="text-white text-[12px] font-medium" style={{ opacity: 0.7 }}>
              {health.critical} item{health.critical !== 1 ? "s" : ""} need attention
            </Text>
          </View>
        </View>

        {/* Stats Row — TODO: wire to /reports/daily-summary */}
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1 bg-white rounded-2xl p-4 border border-kosh-border">
            <Text className="text-kosh-textMuted text-[12px] font-medium mb-1">Today's Purchases</Text>
            <Text className="text-kosh-textMain text-[20px] font-bold">₹42,300</Text>
          </View>
          <View className="flex-1 bg-white rounded-2xl p-4 border border-kosh-border">
            <Text className="text-kosh-textMuted text-[12px] font-medium mb-1">Consumption</Text>
            <Text className="text-kosh-textMain text-[20px] font-bold">₹31,400</Text>
          </View>
        </View>
        <View className="bg-white rounded-2xl p-4 border border-kosh-border mb-4">
          <Text className="text-kosh-textMuted text-[12px] font-medium mb-1">Today's Wastage</Text>
          <Text className="text-kosh-textMain text-[20px] font-bold">₹2,100</Text>
        </View>

        {/* Needs Attention */}
        {urgentItems.length > 0 && (
          <View className="bg-white rounded-2xl border border-kosh-border mb-4 overflow-hidden">
            <View className="px-4 pt-4 pb-2">
              <Text className="text-[15px] font-bold text-kosh-textMain">Needs Attention</Text>
            </View>
            {urgentItems.slice(0, 3).map((item, idx) => (
              <View
                key={item.id}
                className={`px-4 py-3 flex-row items-center gap-3 ${idx < Math.min(urgentItems.length, 3) - 1 ? "border-b border-kosh-border" : ""}`}
              >
                <View className="w-10 h-10 bg-red-50 rounded-xl items-center justify-center">
                  <Text className="text-xl">⚠️</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-[14px] font-semibold text-kosh-textMain">{item.name}</Text>
                  <Text className="text-[12px] text-kosh-textMuted">
                    {item.quantity === 0 ? "Currently out of stock" : `Only ${parseFloat(item.quantity.toFixed(2))} ${item.unit} remaining`}
                  </Text>
                </View>
                <Text className="text-kosh-textMuted">›</Text>
              </View>
            ))}
          </View>
        )}

        {/* AI Recommendations */}
        <View className="bg-kosh-primary rounded-2xl p-5">
          <Text className="text-white font-bold text-[15px] mb-3">AI Recommendations</Text>
          <View className="gap-2">
            {recs.length > 0
              ? recs.slice(0, 3).map(r => (
                  <Text key={r.id} className="text-white text-[13px]" style={{ opacity: 0.8 }}>• {r.title}</Text>
                ))
              : (
                  <Text className="text-white text-[13px]" style={{ opacity: 0.8 }}>No recommendations at this time.</Text>
                )
            }
          </View>
          <TouchableOpacity className="mt-4 rounded-full py-2.5 items-center" style={{ borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" }}>
            <Text className="text-white font-semibold text-[13px]">View All Recommendations</Text>
          </TouchableOpacity>
        </View>

      </View>
    </ScrollView>
  );
}

function ManagerHome({ health }: { health: HealthData }) {
  const tasks = [
    { icon: "📦", title: "Receive Deliveries", count: 2, color: "#EFF6FF" }, // TODO: wire to pending POs
    { icon: "🛒", title: "Pending POs", count: 3, color: "#FFFBEB" },        // TODO: wire to purchase-orders?status=pending
    { icon: "⚠️", title: "Low Stock Items", count: health.low + health.critical, color: "#FEF2F2" },
    { icon: "✏️", title: "Pending Corrections", count: 2, color: "#F5F3FF" }, // TODO: wire to corrections endpoint
  ];

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="px-5 pt-4 pb-6">

        {/* Header */}
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-[13px] text-kosh-textMuted font-medium">Good Morning,</Text>
            <Text className="text-[24px] font-bold text-kosh-textMain">Manager 👋</Text>
          </View>
          <TouchableOpacity className="w-10 h-10 bg-white rounded-full items-center justify-center border border-kosh-border">
            <Text className="text-lg">🔔</Text>
          </TouchableOpacity>
        </View>

        <Text className="text-[17px] font-bold text-kosh-textMain mb-3">Today's Tasks</Text>
        <View className="gap-3 mb-6">
          {tasks.map((task) => (
            <TouchableOpacity
              key={task.title}
              className="bg-white rounded-2xl p-4 flex-row items-center gap-4 border border-kosh-border"
            >
              <View className="w-12 h-12 rounded-xl items-center justify-center" style={{ backgroundColor: task.color }}>
                <Text className="text-2xl">{task.icon}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-kosh-textMain">{task.title}</Text>
                <Text className="text-[13px] text-kosh-textMuted">{task.count} pending</Text>
              </View>
              <View className="w-6 h-6 bg-kosh-primary rounded-full items-center justify-center">
                <Text className="text-white text-[11px] font-bold">{task.count}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1 bg-white rounded-2xl p-4 border border-kosh-border">
            <Text className="text-kosh-textMuted text-[12px] font-medium mb-1">Today's Issues</Text>
            <Text className="text-kosh-textMain text-[20px] font-bold">6 entries</Text>
          </View>
          <View className="flex-1 bg-white rounded-2xl p-4 border border-kosh-border">
            <Text className="text-kosh-textMuted text-[12px] font-medium mb-1">Today's Wastage</Text>
            <Text className="text-kosh-textMain text-[20px] font-bold">3 entries</Text>
          </View>
        </View>

      </View>
    </ScrollView>
  );
}

export default function HomeScreen() {
  const { auth } = useAuth();
  const [role, setRole] = useState<"owner" | "manager">("owner");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthData>({ score: 0, label: "", critical: 0, low: 0, healthy: 0, total: 0 });
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [urgentItems, setUrgentItems] = useState<InventoryItem[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (!auth.token) throw new Error("Not authenticated");
        const [healthData, recsData, inventoryData] = await Promise.allSettled([
          getInventoryHealth(auth.token),
          getAIRecommendations(auth.token),
          getInventory(auth.token),
        ]);
        if (healthData.status === "fulfilled") setHealth(healthData.value);
        if (recsData.status === "fulfilled") setRecs(recsData.value);
        if (inventoryData.status === "fulfilled") {
          setUrgentItems(inventoryData.value.filter(i => isUrgent(i.status)));
        }
      } catch (e: any) {
        setError(e.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    })();
  }, [auth.token]);

  return (
    <SafeAreaView className="flex-1 bg-kosh-bg">
      {/* Role Switcher */}
      <View className="flex-row items-center justify-center py-2 px-4">
        <View className="flex-row bg-white rounded-full p-1 border border-kosh-border gap-1">
          {(["owner", "manager"] as const).map(r => (
            <TouchableOpacity
              key={r}
              onPress={() => setRole(r)}
              className={`px-4 py-1.5 rounded-full ${role === r ? "bg-kosh-textMain" : ""}`}
            >
              <Text className={`text-[11px] font-bold uppercase tracking-wider ${role === r ? "text-white" : "text-kosh-textMuted"}`}>
                {r === "owner" ? "Owner View" : "Manager View"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1B4D36" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-red-500 text-center font-medium">{error}</Text>
        </View>
      ) : role === "owner" ? (
        <OwnerHome health={health} recs={recs} urgentItems={urgentItems} />
      ) : (
        <ManagerHome health={health} />
      )}
    </SafeAreaView>
  );
}
