import { useState, useEffect, useRef } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "../../lib/auth-context";
import { getInventory } from "../../lib/api";

const CATEGORIES = ["All", "Produce", "Meat", "Dairy", "Dry Goods", "Spices", "Beverages"];

type APIItem = {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  category: string | null;
  status: string;
};

function normalizeStatus(status: string): "critical" | "low" | "healthy" {
  const s = status.toLowerCase();
  if (s === "out_of_stock" || s === "out of stock") return "critical";
  if (s === "critical") return "critical";
  if (s === "low") return "low";
  return "healthy";
}

function getStatusColor(status: string): string {
  const s = normalizeStatus(status);
  if (s === "critical") return "#EF4444";
  if (s === "low") return "#EAB308";
  return "#22C55E";
}

function getStatusLabel(status: string): string {
  const raw = status.toLowerCase();
  if (raw === "out_of_stock") return "Out of Stock";
  if (raw === "critical") return "Critical";
  if (raw === "low") return "Low";
  return "Healthy";
}

function Section({ title, items, color }: { title: string; items: APIItem[]; color: string }) {
  return (
    <View className="mb-4">
      <Text className="text-[13px] font-bold mb-2 uppercase tracking-wide" style={{ color }}>
        {title}
      </Text>
      <View className="bg-white rounded-2xl border border-kosh-border overflow-hidden">
        {items.map((item, idx) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => router.push({ pathname: "/(app)/item-detail", params: { itemJson: JSON.stringify(item) } })}
            className={`px-4 py-3 flex-row items-center gap-3 ${idx < items.length - 1 ? "border-b border-kosh-border" : ""}`}
          >
            <View className="w-10 h-10 bg-kosh-bg rounded-xl items-center justify-center">
              <Text className="text-xl">📦</Text>
            </View>
            <View className="flex-1">
              <Text className="text-[14px] font-semibold text-kosh-textMain">{item.name}</Text>
              <Text className="text-[12px] text-kosh-textMuted">{item.category || "General"}</Text>
            </View>
            <View className="items-end">
              <Text className="text-[14px] font-bold text-kosh-textMain">
                {parseFloat(item.quantity.toFixed(2))} {item.unit}
              </Text>
              <View className="flex-row items-center gap-1" style={{ marginTop: 2 }}>
                <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getStatusColor(item.status) }} />
                <Text className="text-[11px] font-medium" style={{ color: getStatusColor(item.status) }}>
                  {getStatusLabel(item.status)}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function InventoryScreen() {
  const { auth } = useAuth();
  console.log("[INVENTORY] auth.token:", auth.token ? auth.token.substring(0, 20) + "..." : "NULL");
  console.log("[INVENTORY] auth.schema:", auth.schema);
  console.log("[INVENTORY] auth.role:", auth.role);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [items, setItems] = useState<APIItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchInventory = async (searchVal: string, category: string) => {
    setLoading(true);
    setError(null);
    try {
      const { loadAuth } = require("../../lib/auth-store");
      const currentAuth = loadAuth();
      console.log("[FETCH] loadAuth token:", currentAuth.token ? currentAuth.token.substring(0, 20) : "NULL");
      console.log("[FETCH] useAuth token:", auth.token ? auth.token.substring(0, 20) : "NULL");
      if (!currentAuth.token) throw new Error("Not authenticated");
      const token = currentAuth.token;
      const params: Record<string, string> = {};
      if (searchVal) params.q = searchVal;
      if (category !== "All") params.category = category;
      const data = await getInventory(token, params);
      setItems(data);
    } catch (e: any) {
      console.log("[INVENTORY ERROR]", e.message, JSON.stringify(e));
      setError(e.message || "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  // Initial load — only fetch when token is available
  useEffect(() => {
    if (!auth.token) return;
    fetchInventory("", "All");
  }, [auth.token]);

  // Category change — immediate
  useEffect(() => {
    if (!auth.token) return;
    fetchInventory(search, activeCategory);
  }, [activeCategory, auth.token]);

  // Search — debounced 300ms
  const handleSearch = (text: string) => {
    setSearch(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchInventory(text, activeCategory);
    }, 300);
  };

  const critical = items.filter(i => normalizeStatus(i.status) === "critical");
  const low = items.filter(i => normalizeStatus(i.status) === "low");
  const healthy = items.filter(i => normalizeStatus(i.status) === "healthy");

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
            onChangeText={handleSearch}
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

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1B4D36" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-red-500 text-center font-medium">{error}</Text>
        </View>
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-kosh-textMuted text-[15px]">No items found</Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
          {critical.length > 0 && <Section title={`Critical (${critical.length})`} items={critical} color="#EF4444" />}
          {low.length > 0 && <Section title={`Low (${low.length})`} items={low} color="#EAB308" />}
          {healthy.length > 0 && <Section title={`Healthy (${healthy.length})`} items={healthy} color="#22C55E" />}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
