import { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Sparkles, TrendingUp, Info, AlertTriangle, ShieldCheck, PieChart, ShoppingBag, Trash2 } from "lucide-react-native";
import { useAuth } from "../../lib/auth-context";
import { getInventoryHealth, getTopItems, getWastageSummary, getFoodCostTrend } from "../../lib/api";
import { MiseLogo, colors } from "../../components/ui";
import Svg, { Path, Circle, Line } from "react-native-svg";

function SpendTrendChart({ data }: { data: { day: string; total_spend: number }[] }) {
  if (!data || data.length === 0) {
    return (
      <View style={{ height: 120, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: "600" }}>No spend data for this period</Text>
      </View>
    );
  }

  const W = 320;
  const H = 120;
  const PAD = { top: 10, bottom: 10, left: 10, right: 10 };
  const maxVal = Math.max(1, ...data.map(d => d.total_spend || 0));
  const stepX = data.length > 1 ? (W - PAD.left - PAD.right) / (data.length - 1) : (W - PAD.left - PAD.right) / 2;
  const pts = data.map((d, i) => ({
    x: PAD.left + (data.length > 1 ? i * stepX : stepX),
    y: PAD.top + (1 - (d.total_spend || 0) / maxVal) * (H - PAD.top - PAD.bottom),
    label: d.day,
    val: d.total_spend || 0,
  }));

  let dPath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <View>
      <View style={{ height: H }}>
        <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          {[0, 1, 2].map(i => (
            <Line
              key={i}
              x1={0}
              y1={PAD.top + (i / 2) * (H - PAD.top - PAD.bottom)}
              x2={W}
              y2={PAD.top + (i / 2) * (H - PAD.top - PAD.bottom)}
              stroke={colors.border}
              strokeWidth={1}
            />
          ))}
          {data.length > 1 && <Path d={dPath} fill="none" stroke={colors.primary} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />}
          {pts.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r={5} fill="white" stroke={colors.primary} strokeWidth={3} />
          ))}
        </Svg>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12 }}>
        {data.map((d, i) => (
          <Text key={i} style={{ fontSize: 11, fontWeight: "800", color: colors.textMuted }}>{d.day}</Text>
        ))}
      </View>
    </View>
  );
}

export default function AnalyticsScreen() {
  const { auth } = useAuth();
  const [health, setHealth] = useState<any>(null);
  const [topItems, setTopItems] = useState<any[]>([]);
  const [wastageSummary, setWastageSummary] = useState<any>(null);
  const [foodCostTrend, setFoodCostTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.token) return;
    (async () => {
      setLoading(true);
      try {
        const [h, items, w, cost] = await Promise.allSettled([
          getInventoryHealth(auth.token!),
          getTopItems(auth.token!, 5),
          getWastageSummary(auth.token!, 7),
          getFoodCostTrend(auth.token!, 7),
        ]);
        if (h.status === "fulfilled") setHealth(h.value);
        if (items.status === "fulfilled") setTopItems(items.value || []);
        if (w.status === "fulfilled") setWastageSummary(w.value);
        if (cost.status === "fulfilled") setFoodCostTrend(cost.value || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [auth.token]);

  const totalSpend = foodCostTrend.reduce((acc, curr) => acc + (curr.total_spend || 0), 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F7F8" }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40, gap: 32 }}>

        {/* Header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 36, fontWeight: "800", color: colors.textMain, letterSpacing: -1 }}>Insights</Text>
          <MiseLogo size="header" />
        </View>

        {/* SANQ Briefing */}
        <View style={{ backgroundColor: colors.primary, borderRadius: 28, padding: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Sparkles size={20} color="#A2C384" strokeWidth={2} />
            <Text style={{ fontSize: 12, fontWeight: "800", color: "#A2C384", letterSpacing: 2, textTransform: "uppercase" }}>SANQ Briefing</Text>
          </View>
          <Text style={{ fontSize: 17, fontWeight: "500", color: "white", lineHeight: 26 }}>
            {health ? (
              <>Your inventory health score is currently <Text style={{ fontWeight: "800", color: "#A2C384" }}>{health.score}% ({health.label})</Text>. You have <Text style={{ fontWeight: "800", color: "white" }}>{health.critical + health.low}</Text> items needing attention soon.</>
            ) : (
              "Tracking your real-time stock levels, purchases, and wastage to protect your margins."
            )}
          </Text>
        </View>

        {/* Sales Analytics Notice */}
        <View style={{ backgroundColor: "#F0F3F6", borderRadius: 24, padding: 20, borderWidth: 1, borderColor: "#E2E8F0", flexDirection: "row", alignItems: "center", gap: 16 }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#E2E8F0", alignItems: "center", justifyContent: "center" }}>
            <PieChart size={22} color={colors.textMuted} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: "800", color: colors.textMain, marginBottom: 4 }}>Sales & Revenue Analytics</Text>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textMuted, lineHeight: 18 }}>
              Sales analytics will appear here once order tracking is connected.
            </Text>
          </View>
        </View>

        {/* Food Cost & Purchase Spend */}
        <View>
          <Text style={{ fontSize: 18, fontWeight: "800", color: colors.textMain, marginBottom: 16, paddingHorizontal: 4, letterSpacing: -0.3 }}>Food Spend (Last 7 Days)</Text>
          <View style={{ backgroundColor: colors.card, borderRadius: 28, borderWidth: 1, borderColor: colors.border, padding: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 20, elevation: 2 }}>
            <Text style={{ fontSize: 12, fontWeight: "800", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Total Purchase Spend</Text>
            <Text style={{ fontSize: 28, fontWeight: "800", color: colors.textMain, letterSpacing: -0.5, marginBottom: 20 }}>₹{(totalSpend / 100).toLocaleString("en-IN")}</Text>
            {loading ? <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 40 }} /> : <SpendTrendChart data={foodCostTrend} />}
          </View>
        </View>

        {/* Inventory Health Breakdown */}
        {health && (
          <View>
            <Text style={{ fontSize: 18, fontWeight: "800", color: colors.textMain, marginBottom: 16, paddingHorizontal: 4, letterSpacing: -0.3 }}>Inventory Health</Text>
            <View style={{ backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: colors.border, padding: 20, gap: 16 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-around", alignItems: "center" }}>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 22, fontWeight: "800", color: "#22c55e" }}>{health.healthy}</Text>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: colors.textMuted }}>Healthy</Text>
                </View>
                <View style={{ width: 1, height: 32, backgroundColor: colors.border }} />
                <View style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 22, fontWeight: "800", color: "#f97316" }}>{health.low}</Text>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: colors.textMuted }}>Low</Text>
                </View>
                <View style={{ width: 1, height: 32, backgroundColor: colors.border }} />
                <View style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 22, fontWeight: "800", color: "#ef4444" }}>{health.critical}</Text>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: colors.textMuted }}>Critical</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Top Wasted Items */}
        <View>
          <Text style={{ fontSize: 18, fontWeight: "800", color: colors.textMain, marginBottom: 16, paddingHorizontal: 4, letterSpacing: -0.3 }}>Top Wasted Items</Text>
          <View style={{ backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: colors.border, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 20, elevation: 2 }}>
            {topItems.length === 0 ? (
              <View style={{ padding: 24, alignItems: "center" }}>
                <Trash2 size={28} color={colors.textMuted} style={{ marginBottom: 8 }} />
                <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: "600" }}>No wastage recorded recently.</Text>
              </View>
            ) : (
              topItems.map((item, idx) => (
                <View key={idx} style={{ padding: 20, borderBottomWidth: idx < topItems.length - 1 ? 1 : 0, borderBottomColor: colors.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: "800", color: colors.textMain, letterSpacing: -0.2 }}>{item.item}</Text>
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: "#DC2626" }}>{item.total_qty}</Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Wastage Summary */}
        {wastageSummary && wastageSummary.top_items && wastageSummary.top_items.length > 0 && (
          <View>
            <Text style={{ fontSize: 18, fontWeight: "800", color: colors.textMain, marginBottom: 16, paddingHorizontal: 4, letterSpacing: -0.3 }}>Wastage Breakdown (7 Days)</Text>
            <View style={{ backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: colors.border, padding: 20, gap: 14 }}>
              {wastageSummary.top_items.map((w: any, idx: number) => (
                <View key={idx} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: colors.textMain }}>{w.item}</Text>
                  <Text style={{ fontSize: 14, fontWeight: "800", color: colors.textMuted }}>{w.total_qty} {w.unit}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
