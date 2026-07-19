import { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Sparkles, TrendingUp } from "lucide-react-native";
import { useAuth } from "../../lib/auth-context";
import { getInventoryHealth, getTopItems, getWastageSummary } from "../../lib/api";
import { MiseLogo, colors } from "../../components/ui";
import Svg, { Path, Circle, Line } from "react-native-svg";

const SALES_DATA = [
  { label: "Mon", amount: 8200 },
  { label: "Tue", amount: 9100 },
  { label: "Wed", amount: 8900 },
  { label: "Thu", amount: 11200 },
  { label: "Fri", amount: 14500 },
  { label: "Sat", amount: 16800 },
  { label: "Sun", amount: 15200 },
];

const TOP_DISHES = [
  { name: "Butter Chicken", qty: "142 orders", rev: "₹49,700" },
  { name: "Garlic Naan", qty: "312 orders", rev: "₹18,720" },
  { name: "Paneer Tikka", qty: "98 orders", rev: "₹27,440" },
];

const CATEGORIES = [
  { cat: "Food", pct: 68, val: "₹57,052", color: "#1B4D36" },
  { cat: "Beverage", pct: 22, val: "₹18,458", color: "#A2C384" },
  { cat: "Dessert", pct: 10, val: "₹8,390", color: "#DBBC83" },
];

function LineChart() {
  const W = 320;
  const H = 120;
  const PAD = { top: 10, bottom: 10, left: 0, right: 0 };
  const maxVal = Math.max(...SALES_DATA.map(d => d.amount));
  const stepX = (W - PAD.left - PAD.right) / (SALES_DATA.length - 1);
  const pts = SALES_DATA.map((d, i) => ({
    x: PAD.left + i * stepX,
    y: PAD.top + (1 - d.amount / maxVal) * (H - PAD.top - PAD.bottom),
    label: d.label,
  }));

  let d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

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
          <Path d={d} fill="none" stroke={colors.primary} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          {pts.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r={5} fill="white" stroke={colors.primary} strokeWidth={3} />
          ))}
        </Svg>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12 }}>
        {SALES_DATA.map((d, i) => (
          <Text key={i} style={{ fontSize: 11, fontWeight: "800", color: colors.textMuted }}>{d.label}</Text>
        ))}
      </View>
    </View>
  );
}

export default function AnalyticsScreen() {
  const { auth } = useAuth();
  const [health, setHealth] = useState<any>(null);
  const [topItems, setTopItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.token) return;
    (async () => {
      setLoading(true);
      try {
        const [h, items] = await Promise.allSettled([
          getInventoryHealth(auth.token!),
          getTopItems(auth.token!, 5),
        ]);
        if (h.status === "fulfilled") setHealth(h.value);
        if (items.status === "fulfilled") setTopItems(items.value);
      } finally {
        setLoading(false);
      }
    })();
  }, [auth.token]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F7F8" }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40, gap: 32 }}>

        {/* Header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 36, fontWeight: "800", color: colors.textMain, letterSpacing: -1 }}>Insights</Text>
          <MiseLogo size="header" />
        </View>

        {/* MISE Briefing */}
        <View style={{ backgroundColor: colors.primary, borderRadius: 28, padding: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Sparkles size={20} color="#A2C384" strokeWidth={2} />
            <Text style={{ fontSize: 12, fontWeight: "800", color: "#A2C384", letterSpacing: 2, textTransform: "uppercase" }}>MISE Briefing</Text>
          </View>
          <Text style={{ fontSize: 17, fontWeight: "500", color: "white", lineHeight: 26 }}>
            Your food cost ratio improved to <Text style={{ fontWeight: "800", color: "white" }}>28%</Text> this week. Overall sales are tracking <Text style={{ fontWeight: "800", color: "#A2C384" }}>12% higher</Text> compared to last week.
          </Text>
        </View>

        {/* Sales Trend */}
        <View>
          <Text style={{ fontSize: 18, fontWeight: "800", color: colors.textMain, marginBottom: 16, paddingHorizontal: 4, letterSpacing: -0.3 }}>Sales Trends (Last 7 Days)</Text>
          <View style={{ backgroundColor: colors.card, borderRadius: 28, borderWidth: 1, borderColor: colors.border, padding: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 20, elevation: 2 }}>
            <Text style={{ fontSize: 12, fontWeight: "800", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Total Revenue</Text>
            <Text style={{ fontSize: 24, fontWeight: "800", color: colors.textMain, letterSpacing: -0.5, marginBottom: 20 }}>₹83,900</Text>
            <LineChart />
          </View>
        </View>

        {/* Top Selling Dishes */}
        <View>
          <Text style={{ fontSize: 18, fontWeight: "800", color: colors.textMain, marginBottom: 16, paddingHorizontal: 4, letterSpacing: -0.3 }}>Top Selling Dishes</Text>
          <View style={{ backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: colors.border, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 20, elevation: 2 }}>
            {TOP_DISHES.map((dish, idx) => (
              <View key={idx} style={{ padding: 20, borderBottomWidth: idx < TOP_DISHES.length - 1 ? 1 : 0, borderBottomColor: colors.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: colors.textMain, letterSpacing: -0.2, marginBottom: 4 }}>{dish.name}</Text>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textMuted }}>{dish.qty}</Text>
                </View>
                <Text style={{ fontSize: 16, fontWeight: "800", color: colors.textMain }}>{dish.rev}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Revenue by Category */}
        <View>
          <Text style={{ fontSize: 18, fontWeight: "800", color: colors.textMain, marginBottom: 16, paddingHorizontal: 4, letterSpacing: -0.3 }}>Revenue by Category</Text>
          <View style={{ backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: colors.border, padding: 24, gap: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 20, elevation: 2 }}>
            {CATEGORIES.map((item, i) => (
              <View key={i}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                  <Text style={{ fontSize: 14, fontWeight: "800", color: colors.textMain }}>{item.cat}</Text>
                  <Text style={{ fontSize: 14, fontWeight: "800", color: colors.textMuted }}>{item.val}</Text>
                </View>
                <View style={{ height: 10, backgroundColor: "#F4F5F7", borderRadius: 100, overflow: "hidden" }}>
                  <View style={{ height: "100%", width: `${item.pct}%`, backgroundColor: item.color, borderRadius: 100 }} />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Ingredient Consumption Alert */}
        <View>
          <View style={{ backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: "#FECACA", padding: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 20, elevation: 2 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#FEF2F2", alignItems: "center", justifyContent: "center" }}>
                <TrendingUp size={20} color="#DC2626" strokeWidth={2} />
              </View>
              <Text style={{ fontSize: 17, fontWeight: "800", color: colors.textMain, letterSpacing: -0.3 }}>Usage Spikes Detected</Text>
            </View>
            <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: "600", lineHeight: 22, marginBottom: 16 }}>
              Tomatoes and Heavy Cream usage is up by 18% compared to the daily average. This aligns with the increase in Butter Chicken sales.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(app)/inventory")}
              style={{ backgroundColor: "#FEF2F2", borderRadius: 16, paddingVertical: 14, alignItems: "center" }}
            >
              <Text style={{ fontSize: 15, fontWeight: "800", color: "#DC2626" }}>Check Stock Levels</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
