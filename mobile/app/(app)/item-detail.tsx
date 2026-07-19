import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

type APIItem = {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  suggested_purchase?: number;
  category: string | null;
  status: string;
};

function getStatusColor(status: string): string {
  const s = status.toLowerCase();
  if (s === "out_of_stock" || s === "out of stock" || s === "critical") return s === "critical" ? "#F97316" : "#EF4444";
  if (s === "low") return "#EAB308";
  return "#22C55E";
}

function getStatusLabel(status: string): string {
  const s = status.toLowerCase();
  if (s === "out_of_stock") return "Out of Stock";
  if (s === "critical") return "Critical";
  if (s === "low") return "Low";
  return "Healthy";
}

export default function ItemDetailScreen() {
  const { itemJson } = useLocalSearchParams<{ itemJson: string }>();

  let item: APIItem | null = null;
  try {
    item = JSON.parse(itemJson);
  } catch {}

  if (!item) {
    return (
      <SafeAreaView className="flex-1 bg-kosh-bg items-center justify-center">
        <Text className="text-kosh-textMuted">Item not found</Text>
      </SafeAreaView>
    );
  }

  const statusColor = getStatusColor(item.status);
  const statusLabel = getStatusLabel(item.status);

  const actions = [
    {
      icon: "📥",
      label: "Receive Stock",
      route: "/(app)/receive-stock",
      params: { id: item.id, itemName: item.name, unit: item.unit, currentQty: String(item.quantity) },
    },
    {
      icon: "📤",
      label: "Issue Stock",
      route: "/(app)/issue-stock",
      params: { id: item.id, itemName: item.name, unit: item.unit, currentQty: String(item.quantity) },
    },
    {
      icon: "✏️",
      label: "Adjust Stock",
      route: "/(app)/adjust-stock",
      params: { id: item.id, itemName: item.name, unit: item.unit, currentQty: String(item.quantity) },
    },
    {
      icon: "🗑️",
      label: "Log Wastage",
      route: "/(app)/log-wastage",
      params: { id: item.id, itemName: item.name, unit: item.unit },
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-kosh-bg">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="px-5 pt-4 pb-8">

          {/* Back */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 -ml-2 rounded-full items-center justify-center mb-4"
          >
            <Text className="text-[28px] text-kosh-textMain">‹</Text>
          </TouchableOpacity>

          {/* Item Card */}
          <View className="bg-white rounded-3xl p-5 border border-kosh-border mb-4">
            <View className="flex-row items-center gap-4 mb-4">
              <View className="w-16 h-16 bg-kosh-bg rounded-2xl items-center justify-center">
                <Text className="text-4xl">📦</Text>
              </View>
              <View className="flex-1">
                <Text className="text-[22px] font-bold text-kosh-textMain">{item.name}</Text>
                <Text className="text-[14px] text-kosh-textMuted">{item.category || "General"}</Text>
              </View>
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1 bg-kosh-bg rounded-2xl p-3">
                <Text className="text-kosh-textMuted text-[12px] font-medium mb-1">Current Stock</Text>
                <Text className="text-kosh-textMain text-[22px] font-bold">{item.quantity}</Text>
                <Text className="text-kosh-textMuted text-[12px]">{item.unit}</Text>
              </View>
              <View className="flex-1 bg-kosh-bg rounded-2xl p-3">
                <Text className="text-kosh-textMuted text-[12px] font-medium mb-1">Suggested Buy</Text>
                <Text className="text-kosh-textMain text-[22px] font-bold">{item.suggested_purchase ?? 0}</Text>
                <Text className="text-kosh-textMuted text-[12px]">{item.unit}</Text>
              </View>
              <View className="flex-1 bg-kosh-bg rounded-2xl p-3">
                <Text className="text-kosh-textMuted text-[12px] font-medium mb-1">Status</Text>
                <View className="flex-row items-center gap-1" style={{ marginTop: 4 }}>
                  <View className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} />
                  <Text className="text-[12px] font-bold" style={{ color: statusColor }}>{statusLabel}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Actions */}
          <Text className="text-[15px] font-bold text-kosh-textMain mb-3">Actions</Text>
          <View className="bg-white rounded-2xl border border-kosh-border overflow-hidden">
            {actions.map((action, idx) => (
              <TouchableOpacity
                key={action.label}
                onPress={() => router.push({ pathname: action.route as any, params: action.params })}
                className={`px-4 py-4 flex-row items-center gap-3 ${idx < actions.length - 1 ? "border-b border-kosh-border" : ""}`}
              >
                <Text className="text-xl">{action.icon}</Text>
                <Text className="flex-1 text-[15px] font-medium text-kosh-textMain">{action.label}</Text>
                <Text className="text-kosh-textMuted text-[18px]">›</Text>
              </TouchableOpacity>
            ))}
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
