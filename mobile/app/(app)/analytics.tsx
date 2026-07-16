import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// TODO: Replace all mock data with API calls:
// GET /api/v1/reports/inventory-health -> healthData
// GET /api/v1/reports/food-cost-trend?days=7 -> costTrend
// GET /api/v1/reports/top-items?limit=5 -> topItems
// GET /api/v1/reports/wastage-summary?days=7 -> wastageSummary
// GET /api/v1/reports/purchases-summary?days=7 -> purchasesSummary

const COST_TREND = [
  { day: "Mon", value: 28400 },
  { day: "Tue", value: 31200 },
  { day: "Wed", value: 29800 },
  { day: "Thu", value: 33100 },
  { day: "Fri", value: 35600 },
  { day: "Sat", value: 39200 },
  { day: "Sun", value: 31400 },
];

const TOP_ITEMS = [
  { item: "Basmati Rice", qty: 70, unit: "kg" },
  { item: "Chicken Breast", qty: 63, unit: "kg" },
  { item: "Onions", qty: 42, unit: "kg" },
  { item: "Sunflower Oil", qty: 38, unit: "L" },
  { item: "Tomatoes", qty: 28, unit: "kg" },
];

const WASTAGE = [
  { item: "Paneer", qty: 10, unit: "kg", reason: "Spoiled" },
  { item: "Butter", qty: 3, unit: "kg", reason: "Expired" },
  { item: "Heavy Cream", qty: 2, unit: "L", reason: "Spillage" },
];

const maxCost = Math.max(...COST_TREND.map(d => d.value));
const maxQty = Math.max(...TOP_ITEMS.map(i => i.qty));

type Period = "7D" | "30D" | "90D";

export default function AnalyticsScreen() {
  const [period, setPeriod] = useState<Period>("7D");

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
                  <Text className={`text-[12px] font-bold ${period === p ? "text-white" : "text-kosh-textMuted"}`}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Health Score */}
          <View className="bg-kosh-primary rounded-3xl p-5 mb-4">
            <Text className="text-white font-bold text-[15px] mb-3">Inventory Health</Text>
            <View className="flex-row justify-between">
              {[
                { label: "Score", value: "94", unit: "/100" },
                { label: "Critical", value: "2", unit: "items" },
                { label: "Low", value: "3", unit: "items" },
                { label: "Healthy", value: "15", unit: "items" },
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
          <View className="bg-white rounded-2xl p-4 border border-kosh-border mb-4">
            <Text className="text-[15px] font-bold text-kosh-textMain mb-4">Food Cost Trend</Text>
            <View className="flex-row items-end gap-2" style={{ height: 80 }}>
              {COST_TREND.map((d) => {
                const heightPct = d.value / maxCost;
                return (
                  <View key={d.day} className="flex-1 items-center gap-1">
                    <View
                      className="w-full rounded-t-lg bg-kosh-primary"
                      style={{ height: Math.max(8, heightPct * 64), opacity: 0.8 }}
                    />
                    <Text className="text-[10px] text-kosh-textMuted font-medium">{d.day}</Text>
                  </View>
                );
              })}
            </View>
            <View className="mt-3 pt-3 border-t border-kosh-border flex-row justify-between">
              <Text className="text-[12px] text-kosh-textMuted">Avg daily</Text>
              <Text className="text-[12px] font-bold text-kosh-textMain">
                ₹{Math.round(COST_TREND.reduce((s, d) => s + d.value, 0) / COST_TREND.length).toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Top Items by Usage */}
          <View className="bg-white rounded-2xl p-4 border border-kosh-border mb-4">
            <Text className="text-[15px] font-bold text-kosh-textMain mb-4">Top Items by Usage</Text>
            <View className="gap-3">
              {TOP_ITEMS.map((item) => {
                const widthPct = item.qty / maxQty;
                return (
                  <View key={item.item}>
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-[13px] font-medium text-kosh-textMain">{item.item}</Text>
                      <Text className="text-[13px] font-bold text-kosh-textMuted">{item.qty} {item.unit}</Text>
                    </View>
                    <View className="h-2 bg-kosh-bg rounded-full overflow-hidden">
                      <View
                        className="h-full bg-kosh-accent rounded-full"
                        style={{ width: `${widthPct * 100}%` }}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Wastage Summary */}
          <View className="bg-white rounded-2xl p-4 border border-kosh-border mb-4">
            <Text className="text-[15px] font-bold text-kosh-textMain mb-3">Wastage Summary</Text>
            <View className="gap-2">
              {WASTAGE.map((w, idx) => (
                <View
                  key={idx}
                  className={`flex-row justify-between items-center py-2 ${idx < WASTAGE.length - 1 ? "border-b border-kosh-border" : ""}`}
                >
                  <View>
                    <Text className="text-[14px] font-medium text-kosh-textMain">{w.item}</Text>
                    <Text className="text-[12px] text-kosh-textMuted">{w.reason}</Text>
                  </View>
                  <Text className="text-[14px] font-bold" style={{ color: "#EF4444" }}>{w.qty} {w.unit}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Purchases Summary */}
          <View className="bg-white rounded-2xl p-4 border border-kosh-border">
            <Text className="text-[15px] font-bold text-kosh-textMain mb-3">Purchases This Week</Text>
            {[
              { supplier: "Fresh Dairy", orders: 2, spend: "₹22,100" },
              { supplier: "APMC Traders", orders: 2, spend: "₹12,600" },
              { supplier: "United Meats", orders: 1, spend: "₹7,600" },
            ].map((s, idx, arr) => (
              <View
                key={s.supplier}
                className={`flex-row justify-between items-center py-3 ${idx < arr.length - 1 ? "border-b border-kosh-border" : ""}`}
              >
                <View>
                  <Text className="text-[14px] font-medium text-kosh-textMain">{s.supplier}</Text>
                  <Text className="text-[12px] text-kosh-textMuted">{s.orders} orders</Text>
                </View>
                <Text className="text-[14px] font-bold text-kosh-textMain">{s.spend}</Text>
              </View>
            ))}
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
