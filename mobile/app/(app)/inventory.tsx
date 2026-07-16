import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { INVENTORY, CATEGORIES, getStatus, getStatusColor, InventoryItem } from "../../components/inventory-data";

export default function InventoryScreen() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const filtered = INVENTORY.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "All" || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const critical = filtered.filter(i => ["Out of Stock", "Critical"].includes(getStatus(i)));
  const low = filtered.filter(i => getStatus(i) === "Low");
  const healthy = filtered.filter(i => getStatus(i) === "Healthy");

  return (
    <SafeAreaView className="flex-1 bg-kosh-bg">
      <View className="px-5 pt-4 pb-2">
        <Text className="text-[24px] font-bold text-kosh-textMain mb-4">Inventory</Text>

        {/* Search */}
        <View className="bg-white rounded-2xl px-4 py-3 flex-row items-center gap-3 border border-kosh-border mb-4">
          <Text className="text-lg">🔍</Text>
          <TextInput
            placeholder="Search items..."
            placeholderTextColor="#687076"
            value={search}
            onChangeText={setSearch}
            className="flex-1 text-kosh-textMain text-[15px]"
          />
        </View>

        {/* Category Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
          <View className="flex-row gap-2 pb-2">
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                onPress={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full border ${activeCategory === cat ? "bg-kosh-primary border-kosh-primary" : "bg-white border-kosh-border"}`}
              >
                <Text className={`text-[13px] font-semibold ${activeCategory === cat ? "text-white" : "text-kosh-textMuted"}`}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        {critical.length > 0 && (
          <Section title={`Critical (${critical.length})`} items={critical} color="#EF4444" />
        )}
        {low.length > 0 && (
          <Section title={`Low (${low.length})`} items={low} color="#EAB308" />
        )}
        {healthy.length > 0 && (
          <Section title={`Healthy (${healthy.length})`} items={healthy} color="#22C55E" />
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, items, color }: { title: string; items: InventoryItem[]; color: string }) {
  return (
    <View className="mb-4">
      <Text className="text-[13px] font-bold mb-2 uppercase tracking-wide" style={{ color }}>
        {title}
      </Text>
      <View className="bg-white rounded-2xl border border-kosh-border overflow-hidden">
        {items.map((item, idx) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => router.push({ pathname: "/(app)/item-detail", params: { id: item.id } })}
            className={`px-4 py-3 flex-row items-center gap-3 ${idx < items.length - 1 ? "border-b border-kosh-border" : ""}`}
          >
            <View className="w-10 h-10 bg-kosh-bg rounded-xl items-center justify-center">
              <Text className="text-xl">{item.img}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-[14px] font-semibold text-kosh-textMain">{item.name}</Text>
              <Text className="text-[12px] text-kosh-textMuted">{item.category}</Text>
            </View>
            <View className="items-end">
              <Text className="text-[14px] font-bold text-kosh-textMain">
                {item.quantity} {item.unit}
              </Text>
              <View className="flex-row items-center gap-1" style={{ marginTop: 2 }}>
                <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getStatusColor(getStatus(item)) }} />
                <Text className="text-[11px] font-medium" style={{ color: getStatusColor(getStatus(item)) }}>
                  {getStatus(item)}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
