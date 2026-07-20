import { useState, useEffect, useRef } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronDown, ChevronRight } from "lucide-react-native";
import { useAuth } from "../../lib/auth-context";
import { getInventory } from "../../lib/api";
import { MiseLogo, SearchField, colors } from "../../components/ui";
import { CategoryIcon } from "../../components/CategoryIcon";

type APIItem = {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  category: string | null;
  status: string;
  suggested_purchase?: number;
};

const STATUS_FILTERS = ["All", "Critical", "Low", "Out of Stock"];
const CATEGORIES = ["All Categories", "Veg", "Dairy", "Grains", "Oil", "Beverages", "Meat", "Spices"];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; border: string }> = {
    healthy: { bg: "#ECFDF5", text: "#065F46", border: "#D1FAE5" },
    low: { bg: "#FEFCE8", text: "#A16207", border: "#FEF08A" },
    critical: { bg: "#FFF7ED", text: "#C2410C", border: "#FED7AA" },
    out_of_stock: { bg: "#FEF2F2", text: "#DC2626", border: "#FECACA" },
  };
  const s = status.toLowerCase().replace(/\s/g, "_");
  const style = map[s] || { bg: "#F4F5F7", text: "#687076", border: "#EAECEF" };
  const label = status === "out_of_stock" || status === "Out of Stock" ? "Out of Stock"
    : status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <View style={{ backgroundColor: style.bg, borderWidth: 1, borderColor: style.border, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 }}>
      <Text style={{ fontSize: 11, fontWeight: "800", color: style.text, letterSpacing: 1, textTransform: "uppercase" }}>{label}</Text>
    </View>
  );
}

export default function InventoryScreen() {
  const { auth } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [catOpen, setCatOpen] = useState(false);
  const [items, setItems] = useState<APIItem[]>([]);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchInventory = async (q: string) => {
    if (!auth.token) return;
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (q) params.q = q;
      const data = await getInventory(auth.token, params);
      setItems(data);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { if (auth.token) fetchInventory(""); }, [auth.token]);

  const handleSearch = (text: string) => {
    setSearch(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchInventory(text), 300);
  };

  const hasCritical = items.some(i => i.status.toLowerCase() === "critical");
  const hasLow = items.some(i => i.status.toLowerCase() === "low");
  const hasOut = items.some(i => i.status.toLowerCase().includes("out"));

  const needsDot = (tab: string) => {
    if (tab === "Critical") return hasCritical;
    if (tab === "Low") return hasLow;
    if (tab === "Out of Stock") return hasOut;
    return false;
  };

  const filtered = items.filter(item => {
    const s = item.status.toLowerCase();
    const matchesStatus =
      statusFilter === "All" ? true :
      statusFilter === "Critical" ? s === "critical" :
      statusFilter === "Low" ? s === "low" :
      statusFilter === "Out of Stock" ? s.includes("out") : true;
    const matchesCat = categoryFilter === "All Categories" ? true : item.category === categoryFilter;
    return matchesStatus && matchesCat;
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F7F8" }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40 }}>

        {/* Header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <Text style={{ fontSize: 36, fontWeight: "800", color: colors.textMain, letterSpacing: -1 }}>Inventory</Text>
          <MiseLogo size="header" />
        </View>

        {/* Search + Category */}
        <View style={{ gap: 12, marginBottom: 16 }}>
          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <SearchField value={search} onChange={handleSearch} placeholder="Search inventory..." />
            </View>
            <TouchableOpacity
              onPress={() => setCatOpen(!catOpen)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: 16,
                height: 48,
                borderRadius: 20,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.03,
                shadowRadius: 20,
                elevation: 1,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "800", color: colors.textMain }}>
                {categoryFilter === "All Categories" ? "Category" : categoryFilter}
              </Text>
              <ChevronDown size={16} color={colors.textMain} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Category dropdown */}
          {catOpen && (
            <View style={{
              backgroundColor: colors.card,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: colors.border,
              overflow: "hidden",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.08,
              shadowRadius: 24,
              elevation: 8,
            }}>
              {CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c}
                  onPress={() => { setCategoryFilter(c); setCatOpen(false); }}
                  style={{ paddingHorizontal: 20, paddingVertical: 14, backgroundColor: categoryFilter === c ? "#F4F5F7" : "transparent" }}
                >
                  <Text style={{ fontSize: 14, fontWeight: categoryFilter === c ? "800" : "600", color: categoryFilter === c ? colors.textMain : colors.textMuted }}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Status filter pills */}
          <View style={{
            flexDirection: "row",
            backgroundColor: colors.card,
            padding: 4,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.03,
            shadowRadius: 20,
            elevation: 1,
          }}>
            {STATUS_FILTERS.map(tab => (
              <TouchableOpacity
                key={tab}
                onPress={() => setStatusFilter(tab)}
                style={{
                  flex: 1,
                  alignItems: "center",
                  paddingVertical: 10,
                  borderRadius: 16,
                  backgroundColor: statusFilter === tab ? colors.textMain : "transparent",
                }}
              >
                <View style={{ position: "relative" }}>
                  <Text style={{
                    fontSize: 12,
                    fontWeight: "800",
                    color: statusFilter === tab ? "white" : colors.textMuted,
                  }}>{tab}</Text>
                  {needsDot(tab) && (
                    <View style={{
                      position: "absolute",
                      top: -2,
                      right: -8,
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: "#EF4444",
                    }} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Items list */}
        {loading ? (
          <View style={{ paddingTop: 80, alignItems: "center" }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={{
            paddingVertical: 64,
            alignItems: "center",
            backgroundColor: colors.card,
            borderRadius: 32,
            borderWidth: 1,
            borderColor: colors.border,
            marginTop: 8,
          }}>
            <View style={{
              width: 64,
              height: 64,
              backgroundColor: "#F4F5F7",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}>
              <Package size={32} color={colors.textMuted} strokeWidth={2} />
            </View>
            <Text style={{ fontSize: 17, fontWeight: "800", color: colors.textMain, marginBottom: 8, letterSpacing: -0.3 }}>No ingredients match.</Text>
            <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: "600", textAlign: "center", maxWidth: 220 }}>Try adjusting your filters or search term.</Text>
          </View>
        ) : (
          <View style={{ gap: 12, marginTop: 8 }}>
            {filtered.map(item => (
              <TouchableOpacity
                key={item.id}
                onPress={() => router.push({ pathname: "/(app)/item-detail", params: { itemJson: JSON.stringify(item) } })}
                activeOpacity={0.95}
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 24,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 20,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.03,
                  shadowRadius: 20,
                  elevation: 2,
                }}
              >
                {/* Top row */}
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 16, flex: 1, minWidth: 0 }}>
                    <CategoryIcon category={item.category} size={56} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontSize: 17, fontWeight: "800", color: colors.textMain, letterSpacing: -0.3, marginBottom: 4 }} numberOfLines={1}>{item.name}</Text>
                      <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 }} numberOfLines={1}>{item.category || "General"}</Text>
                    </View>
                  </View>
                  <StatusBadge status={item.status} />
                </View>

                {/* Bottom row */}
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
                  <View>
                    <Text style={{ fontSize: 12, fontWeight: "800", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Current Stock</Text>
                    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
                      <Text style={{ fontSize: 22, fontWeight: "800", color: colors.textMain, letterSpacing: -0.5 }}>{parseFloat(item.quantity.toFixed(2))}</Text>
                      <Text style={{ fontSize: 15, fontWeight: "600", color: colors.textMuted }}>{item.unit}</Text>
                    </View>
                  </View>
                  <ChevronRight size={20} color={colors.textMuted} strokeWidth={2} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
