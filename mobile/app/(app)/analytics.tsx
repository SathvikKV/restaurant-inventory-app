import { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../lib/auth-context";
import {
  getInventoryHealth,
  getWastageSummary,
  getPurchasesSummary,
  getTopItems,
  getFoodCostTrend,
} from "../../lib/api";

type Period = "7D" | "30D" | "90D";

const PERIOD_DAYS: Record<Period, number> = { "7D": 7, "30D": 30, "90D": 90 };

export default function AnalyticsScreen() {
  const { auth } = useAuth();
  const [period, setPeriod] = useState<Period>("7D");
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<any>(null);
  const [costTrend, setCostTrend] = useState<any[]>([]);
  const [topItems, setTopItems] = useState<any[]>([]);
  const [wastage, setWastage] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        if (!auth.token) return;
        const days = PERIOD_DAYS[period];
        const [healthRes, costRes, topRes, wastageRes, purchasesRes] = await Promise.allSettled([
          getInventoryHealth(auth.token),
          getFoodCostTrend(auth.token, days),
          getTopItems(auth.token, 5),
          getWastageSummary(auth.token, days),
          getPurchasesSummary(auth.token, days),
        ]);
        if (healthRes.status === "fulfilled") setHealth(healthRes.value);
        if (costRes.status === "fulfilled") setCostTrend(Array.isArray(costRes.value) ? costRes.value : []);
        if (topRes.status === "fulfilled") {
          console.log("[TOP ITEMS]", JSON.stringify(topRes.value));
          setTopItems(Array.isArray(topRes.value) ? topRes.value : []);
        }
        if (wastageRes.status === "fulfilled") {
          const w = wastageRes.value;
          setWastage(Array.isArray(w) ? w : Array.isArray(w?.items) ? w.items : []);
        }
        if (purchasesRes.status === "fulfilled") {
          const p = purchasesRes.value;
          setPurchases(Array.isArray(p) ? p : Array.isArray(p?.suppliers) ? p.suppliers : []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [period, auth.token]);

  const maxCost = costTrend.length > 0 ? Math.max(...costTrend.map((d: any) => d.value ?? d.total ?? 0)) : 1;
  const maxQty = topItems.length > 0 ? Math.max(...topItems.map((i: any) => i.total_issued ?? i.total_qty ?? i.quantity ?? i.qty ?? 0)) : 1;

  return (
    <SafeAreaView className="flex-1 bg-kosh-bg">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="px-5 pt-4 pb-8">

          {/* Header */}
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-[24px] font-bold text-kosh-textMain">Analytics</Text>
            <View className="flex-row bg-white rounded-full p-1 border border-kosh-border gap-1">
              {(["7D", "30D", "90D"] as Period[]).map(p => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-full ${period === p ? "bg-kosh-primary" : ""}`}
                >
                  <Text className={`text-[12px] font-bold ${period === p ? "text-white" : "text-kosh-textMuted"}`}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {loading ? (
            <View className="items-center justify-center py-20">
              <ActivityIndicator size="large" color="#1B4D36" />
            </View>
          ) : (
            <>
              {/* Health Score */}
              <View className="bg-kosh-primary rounded-3xl p-5 mb-4">
                <Text className="text-white font-bold text-[15px] mb-3">Inventory Health</Text>
                <View className="flex-row justify-between">
                  {[
                    { label: "Score", value: String(health?.score ?? "—"), unit: "/100" },
                    { label: "Critical", value: String(health?.critical ?? 0), unit: "items" },
                    { label: "Low", value: String(health?.low ?? 0), unit: "items" },
                    { label: "Healthy", value: String(health?.healthy ?? 0), unit: "items" },
                  ].map(stat => (
                    <View key={stat.label} className="items-center">
                      <Text className="text-white text-[22px] font-bold">{stat.value}</Text>
                      <Text style={{ color: "rgba(255,255,255,0.6)" }} className="text-[11px]">{stat.unit}</Text>
                      <Text style={{ color: "rgba(255,255,255,0.6)" }} className="text-[11px]">{stat.label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Food Cost Trend */}
              {costTrend.length > 0 && (
                <View className="bg-white rounded-2xl p-4 border border-kosh-border mb-4">
                  <Text className="text-[15px] font-bold text-kosh-textMain mb-4">Food Cost Trend</Text>
                  <View className="flex-row items-end gap-2" style={{ height: 80 }}>
                    {costTrend.map((d: any, idx: number) => {
                      const val = d.value ?? d.total ?? 0;
                      const heightPct = val / maxCost;
                      return (
                        <View key={idx} className="flex-1 items-center gap-1">
                          <View
                            className="w-full rounded-t-lg bg-kosh-primary"
                            style={{ height: Math.max(8, heightPct * 64), opacity: 0.8 }}
                          />
                          <Text className="text-[10px] text-kosh-textMuted font-medium">
                            {d.day ?? d.date ?? String(idx + 1)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                  <View className="mt-3 pt-3 border-t border-kosh-border flex-row justify-between">
                    <Text className="text-[12px] text-kosh-textMuted">Avg daily</Text>
                    <Text className="text-[12px] font-bold text-kosh-textMain">
                      ₹{Math.round(costTrend.reduce((s: number, d: any) => s + (d.value ?? d.total ?? 0), 0) / costTrend.length).toLocaleString()}
                    </Text>
                  </View>
                </View>
              )}

              {/* Top Items */}
              {topItems.length > 0 && (
                <View className="bg-white rounded-2xl p-4 border border-kosh-border mb-4">
                  <Text className="text-[15px] font-bold text-kosh-textMain mb-4">Top Items by Usage</Text>
                  <View className="gap-3">
                    {topItems.map((item: any, idx: number) => {
                      const q = item.total_issued ?? item.total_qty ?? item.quantity ?? item.qty ?? 0;
                      return (
                        <View key={idx}>
                          <View className="flex-row justify-between mb-1">
                            <Text className="text-[13px] font-medium text-kosh-textMain">{item.item_name ?? item.item ?? item.name ?? String(item.id).substring(0, 8)}</Text>
                            <Text className="text-[13px] font-bold text-kosh-textMuted">{q} {item.unit}</Text>
                          </View>
                          <View className="h-2 bg-kosh-bg rounded-full overflow-hidden">
                            <View className="h-full bg-kosh-accent rounded-full" style={{ width: `${(q / maxQty) * 100}%` }} />
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Wastage */}
              {wastage.length > 0 && (
                <View className="bg-white rounded-2xl p-4 border border-kosh-border mb-4">
                  <Text className="text-[15px] font-bold text-kosh-textMain mb-3">Wastage Summary</Text>
                  <View className="gap-2">
                    {wastage.map((w: any, idx: number) => (
                      <View
                        key={idx}
                        className={`flex-row justify-between items-center py-2 ${idx < wastage.length - 1 ? "border-b border-kosh-border" : ""}`}
                      >
                        <View>
                          <Text className="text-[14px] font-medium text-kosh-textMain">{w.item ?? w.name}</Text>
                          <Text className="text-[12px] text-kosh-textMuted">{w.reason}</Text>
                        </View>
                        <Text className="text-[14px] font-bold" style={{ color: "#EF4444" }}>
                          {w.qty ?? w.quantity} {w.unit}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Purchases */}
              {purchases.length > 0 && (
                <View className="bg-white rounded-2xl p-4 border border-kosh-border">
                  <Text className="text-[15px] font-bold text-kosh-textMain mb-3">Purchases This Period</Text>
                  {purchases.map((s: any, idx: number) => (
                    <View
                      key={idx}
                      className={`flex-row justify-between items-center py-3 ${idx < purchases.length - 1 ? "border-b border-kosh-border" : ""}`}
                    >
                      <View>
                        <Text className="text-[14px] font-medium text-kosh-textMain">{s.supplier}</Text>
                        <Text className="text-[12px] text-kosh-textMuted">{s.orders ?? s.order_count ?? 0} orders</Text>
                      </View>
                      <Text className="text-[14px] font-bold text-kosh-textMain">
                        {typeof s.spend === "number" ? `₹${s.spend.toLocaleString()}` : s.spend}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {!health && costTrend.length === 0 && topItems.length === 0 && (
                <View className="items-center py-10">
                  <Text className="text-kosh-textMuted">No analytics data available</Text>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
