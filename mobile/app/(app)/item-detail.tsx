import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { INVENTORY, getStatus, getStatusColor } from "../../components/inventory-data";

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = INVENTORY.find(i => i.id === id);

  if (!item) {
    return (
      <SafeAreaView className="flex-1 bg-kosh-bg items-center justify-center">
        <Text className="text-kosh-textMuted">Item not found</Text>
      </SafeAreaView>
    );
  }

  const status = getStatus(item);
  const statusColor = getStatusColor(status);

  const actions = [
    { icon: "📥", label: "Receive Stock", route: "/(app)/receive-stock" },
    { icon: "📤", label: "Issue Stock", route: "/(app)/issue-stock" },
    { icon: "✏️", label: "Adjust Stock", route: "/(app)/adjust-stock" },
    { icon: "🗑️", label: "Log Wastage", route: "/(app)/log-wastage" },
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
                <Text className="text-4xl">{item.img}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-[22px] font-bold text-kosh-textMain">{item.name}</Text>
                <Text className="text-[14px] text-kosh-textMuted">{item.category} · {item.sku}</Text>
              </View>
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1 bg-kosh-bg rounded-2xl p-3">
                <Text className="text-kosh-textMuted text-[12px] font-medium mb-1">Current Stock</Text>
                <Text className="text-kosh-textMain text-[22px] font-bold">{item.quantity}</Text>
                <Text className="text-kosh-textMuted text-[12px]">{item.unit}</Text>
              </View>
              <View className="flex-1 bg-kosh-bg rounded-2xl p-3">
                <Text className="text-kosh-textMuted text-[12px] font-medium mb-1">Reorder At</Text>
                <Text className="text-kosh-textMain text-[22px] font-bold">{item.buffer}</Text>
                <Text className="text-kosh-textMuted text-[12px]">{item.unit}</Text>
              </View>
              <View className="flex-1 bg-kosh-bg rounded-2xl p-3">
                <Text className="text-kosh-textMuted text-[12px] font-medium mb-1">Status</Text>
                <View className="flex-row items-center gap-1" style={{ marginTop: 4 }}>
                  <View className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} />
                  <Text className="text-[12px] font-bold" style={{ color: statusColor }}>{status}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Supplier */}
          <View className="bg-white rounded-2xl p-4 border border-kosh-border mb-4">
            <Text className="text-[13px] font-bold text-kosh-textMuted mb-1 uppercase tracking-wide">Supplier</Text>
            <Text className="text-[16px] font-semibold text-kosh-textMain">{item.supplier}</Text>
            <Text className="text-[13px] text-kosh-textMuted" style={{ marginTop: 2 }}>₹{item.cost} per {item.unit}</Text>
          </View>

          {/* Actions */}
          <Text className="text-[15px] font-bold text-kosh-textMain mb-3">Actions</Text>
          <View className="bg-white rounded-2xl border border-kosh-border overflow-hidden">
            {actions.map((action, idx) => (
              <TouchableOpacity
                key={action.label}
                onPress={() => router.push({ pathname: action.route as any, params: { id: item.id } })}
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
