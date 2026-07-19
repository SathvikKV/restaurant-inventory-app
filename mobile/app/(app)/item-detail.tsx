import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, MoreVertical, AlertTriangle, PenLine, ArrowDownToLine, Package } from "lucide-react-native";
import { colors } from "../../components/ui";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; border: string }> = {
    healthy: { bg: "#ECFDF5", text: "#065F46", border: "#D1FAE5" },
    low: { bg: "#FEFCE8", text: "#A16207", border: "#FEF08A" },
    critical: { bg: "#FFF7ED", text: "#C2410C", border: "#FED7AA" },
    out_of_stock: { bg: "#FEF2F2", text: "#DC2626", border: "#FECACA" },
  };
  const s = status.toLowerCase().replace(/[\s-]/g, "_");
  const style = map[s] || { bg: "#F4F5F7", text: "#687076", border: "#EAECEF" };
  const label = s === "out_of_stock" ? "Out of Stock" : status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <View style={{ backgroundColor: style.bg, borderWidth: 1, borderColor: style.border, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, alignSelf: "center" }}>
      <Text style={{ fontSize: 12, fontWeight: "800", color: style.text, letterSpacing: 1, textTransform: "uppercase" }}>{label}</Text>
    </View>
  );
}

export default function ItemDetailScreen() {
  const { itemJson } = useLocalSearchParams<{ itemJson: string }>();
  const item = JSON.parse(itemJson || "{}");
  const [menuOpen, setMenuOpen] = useState(false);

  const isOut = item.quantity === 0;

  const navParams = { id: item.id, itemName: item.name, unit: item.unit, currentQty: String(item.quantity) };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F7F8" }}>
      {/* Top nav */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}
        >
          <ChevronLeft size={24} color={colors.textMain} strokeWidth={2} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setMenuOpen(!menuOpen)}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}
        >
          <MoreVertical size={24} color={colors.textMain} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* 3-dot menu */}
      {menuOpen && (
        <View style={{
          position: "absolute",
          top: 70,
          right: 16,
          width: 240,
          backgroundColor: colors.card,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: colors.border,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.08,
          shadowRadius: 24,
          elevation: 10,
          zIndex: 100,
          overflow: "hidden",
          paddingVertical: 8,
        }}>
          {["Edit Name", "Edit Buffer", "Edit Unit", "Change Category"].map(action => (
            <TouchableOpacity
              key={action}
              onPress={() => setMenuOpen(false)}
              style={{ paddingHorizontal: 20, paddingVertical: 16 }}
            >
              <Text style={{ fontSize: 15, fontWeight: "800", color: colors.textMain }}>{action}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 120 }}
        onScrollBeginDrag={() => setMenuOpen(false)}
      >
        {/* Item identity */}
        <View style={{ alignItems: "center", gap: 20, marginBottom: 32 }}>
          <View style={{
            width: 112,
            height: 112,
            backgroundColor: colors.card,
            borderRadius: 32,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.05,
            shadowRadius: 40,
            elevation: 3,
          }}>
            <Package size={48} color={colors.textMuted} strokeWidth={1.5} />
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 32, fontWeight: "800", color: colors.textMain, letterSpacing: -0.8, textAlign: "center", marginBottom: 8 }}>{item.name}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: "800", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1.5 }}>{item.category || "General"}</Text>
            </View>
          </View>
          <StatusBadge status={item.status} />
        </View>

        {/* Out of stock urgent banner */}
        {isOut && (
          <View style={{
            backgroundColor: colors.card,
            borderRadius: 28,
            borderWidth: 1,
            borderColor: "#FECACA",
            padding: 24,
            marginBottom: 24,
            overflow: "hidden",
          }}>
            <View style={{ position: "absolute", top: 0, left: 0, width: 6, bottom: 0, backgroundColor: "#EF4444" }} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <AlertTriangle size={20} color="#DC2626" strokeWidth={2} />
              <Text style={{ fontSize: 12, fontWeight: "800", color: "#DC2626", textTransform: "uppercase", letterSpacing: 1.5 }}>Urgent Action</Text>
            </View>
            <Text style={{ fontSize: 18, fontWeight: "800", color: colors.textMain, marginBottom: 8, letterSpacing: -0.3 }}>Item is completely out of stock.</Text>
            <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: "600", lineHeight: 22, marginBottom: 20 }}>Receive an invoice or adjust stock manually to resume operations.</Text>
            <TouchableOpacity
              onPress={() => router.push("/(app)/scan-invoice")}
              style={{ backgroundColor: colors.textMain, borderRadius: 20, paddingVertical: 16, alignItems: "center" }}
            >
              <Text style={{ color: "white", fontSize: 15, fontWeight: "800" }}>Scan Invoice</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Inventory Pulse */}
        <Text style={{ fontSize: 18, fontWeight: "800", color: colors.textMain, marginBottom: 16, paddingHorizontal: 4, letterSpacing: -0.3 }}>Inventory Pulse</Text>
        <View style={{
          backgroundColor: colors.card,
          borderRadius: 28,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 24,
          marginBottom: 24,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.03,
          shadowRadius: 20,
          elevation: 2,
        }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 0 }}>
            <View style={{ width: "50%", paddingBottom: 24 }}>
              <Text style={{ fontSize: 12, fontWeight: "800", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Current Stock</Text>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
                <Text style={{ fontSize: 28, fontWeight: "800", color: colors.textMain, letterSpacing: -0.5 }}>{parseFloat(item.quantity.toFixed(2))}</Text>
                <Text style={{ fontSize: 16, fontWeight: "600", color: colors.textMuted }}>{item.unit}</Text>
              </View>
            </View>
            <View style={{ width: "50%", paddingBottom: 24 }}>
              <Text style={{ fontSize: 12, fontWeight: "800", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Min Buffer</Text>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
                <Text style={{ fontSize: 28, fontWeight: "800", color: "#F97316", letterSpacing: -0.5 }}>{parseFloat((item.suggested_purchase || 0).toFixed(2))}</Text>
                <Text style={{ fontSize: 16, fontWeight: "600", color: "#FDBA74" }}>{item.unit}</Text>
              </View>
            </View>
            <View style={{ width: "100%", height: 1, backgroundColor: colors.border, marginBottom: 24 }} />
            <View style={{ width: "50%" }}>
              <Text style={{ fontSize: 12, fontWeight: "800", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Avg Daily Use</Text>
              <Text style={{ fontSize: 20, fontWeight: "800", color: colors.textMain, letterSpacing: -0.3 }}>—</Text>
            </View>
            <View style={{ width: "50%" }}>
              <Text style={{ fontSize: 12, fontWeight: "800", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Runway</Text>
              <Text style={{ fontSize: 20, fontWeight: "800", color: colors.textMain, letterSpacing: -0.3 }}>—</Text>
            </View>
          </View>
        </View>

        {/* History placeholder */}
        <Text style={{ fontSize: 18, fontWeight: "800", color: colors.textMain, marginBottom: 16, paddingHorizontal: 4, letterSpacing: -0.3 }}>Chronological History</Text>
        <View style={{
          backgroundColor: colors.card,
          borderRadius: 28,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 24,
          alignItems: "center",
        }}>
          <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: "600", textAlign: "center", paddingVertical: 16 }}>No recent history for this item.</Text>
        </View>
      </ScrollView>

      {/* Bottom action bar */}
      <View style={{
        position: "absolute",
        bottom: 24,
        left: 24,
        right: 24,
        flexDirection: "row",
        gap: 12,
        zIndex: 30,
      }}>
        <TouchableOpacity
          onPress={() => router.push({ pathname: "/(app)/log-wastage", params: navParams })}
          style={{
            flex: 1,
            height: 72,
            backgroundColor: colors.card,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.04,
            shadowRadius: 20,
            elevation: 3,
          }}
        >
          <AlertTriangle size={24} color="#EF4444" strokeWidth={2} />
          <Text style={{ fontSize: 12, fontWeight: "800", color: "#EF4444" }}>Waste</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push({ pathname: "/(app)/adjust-stock", params: navParams })}
          style={{
            flex: 1,
            height: 72,
            backgroundColor: colors.card,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.04,
            shadowRadius: 20,
            elevation: 3,
          }}
        >
          <PenLine size={24} color={colors.textMain} strokeWidth={2} />
          <Text style={{ fontSize: 12, fontWeight: "800", color: colors.textMain }}>Adjust</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push({ pathname: "/(app)/issue-stock", params: navParams })}
          style={{
            flex: 1,
            height: 72,
            backgroundColor: colors.textMain,
            borderRadius: 24,
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 5,
          }}
        >
          <ArrowDownToLine size={24} color="white" strokeWidth={2} />
          <Text style={{ fontSize: 12, fontWeight: "800", color: "white" }}>Issue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
