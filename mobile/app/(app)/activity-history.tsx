import { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft, Maximize2 } from "lucide-react-native";
import { useAuth } from "../../lib/auth-context";
import { getAllActivity, ActivityFeedItem } from "../../lib/api";
import { colors } from "../../components/ui";
import { ImagePreviewModal } from "../../components/ImagePreviewModal";
import { formatForDisplay } from "../../lib/units";

interface FilterTab {
  label: string;
  actions: string[];
}

const FILTER_TABS: FilterTab[] = [
  { label: "All", actions: [] },
  { label: "Invoices & Receipts", actions: ["invoice", "receive", "confirmation_resolved"] },
  { label: "Issues & KOTs", actions: ["issue"] },
  { label: "Adjustments", actions: ["adjust"] },
  { label: "Waste", actions: ["waste"] },
];

const ACTION_COLORS: Record<string, string> = {
  receive: "#059669",
  invoice: "#059669",
  confirmation_resolved: "#059669",
  waste: "#DC2626",
  issue: "#111418",
  adjust: "#7C3AED",
};

function formatActivityDescription(act: ActivityFeedItem) {
  const absDisplay = formatForDisplay(Math.abs(act.quantity_delta), act.unit);
  const rawDisplay = formatForDisplay(act.quantity_delta, act.unit);
  const name = act.item_name;

  if (act.action === "receive" || act.action === "invoice") {
    const label = act.action === "invoice" ? "(Invoice)" : "";
    return `Received ${absDisplay} of ${name} ${label}`.trim();
  } else if (act.action === "issue") {
    const dest = act.notes || "Kitchen";
    return `Issued ${absDisplay} of ${name} to ${dest}`;
  } else if (act.action === "adjust") {
    const sign = act.quantity_delta >= 0 ? "+" : "";
    const reason = act.notes ? ` (${act.notes})` : "";
    return `Adjusted ${name} by ${sign}${rawDisplay}${reason}`;
  } else if (act.action === "waste") {
    const reason = act.notes ? ` (${act.notes})` : "";
    return `Logged waste: ${absDisplay} of ${name}${reason}`;
  } else if (act.action === "confirmation_resolved") {
    return `Resolved match: received ${absDisplay} of ${name}`;
  } else {
    return `${act.action}: ${rawDisplay} of ${name}`;
  }
}

export default function ActivityHistoryScreen() {
  const { auth } = useAuth();
  const [entries, setEntries] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<string>("All");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchActivity = async (isRefresh = false) => {
    if (!auth.token) return;
    if (!isRefresh) setLoading(true);
    try {
      const tab = FILTER_TABS.find((t) => t.label === selectedTab);
      const actionFilter = tab && tab.actions.length === 1 ? tab.actions[0] : undefined;
      const result = await getAllActivity(auth.token!, actionFilter, 100);
      let data = result || [];
      if (tab && tab.actions.length > 1) {
        data = data.filter((item) => tab.actions.includes(item.action));
      }
      setEntries(data);
    } catch (e) {
      console.error("Failed to load activity:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchActivity(true);
  };

  useEffect(() => {
    fetchActivity();
  }, [auth.token, selectedTab]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F7F8" }}>
      <ImagePreviewModal
        visible={!!previewImage}
        imageUri={previewImage}
        onClose={() => setPreviewImage(null)}
      />

      {/* Nav */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>
        <TouchableOpacity onPress={() => router.navigate("/(app)/more" as any)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}>
          <ChevronLeft size={24} color={colors.textMain} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <Text style={{ fontSize: 36, fontWeight: "800", color: colors.textMain, letterSpacing: -1, marginBottom: 24 }}>Activity</Text>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {FILTER_TABS.map((tab) => {
              const active = selectedTab === tab.label;
              return (
                <TouchableOpacity
                  key={tab.label}
                  onPress={() => setSelectedTab(tab.label)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 100,
                    backgroundColor: active ? colors.textMain : colors.card,
                    borderWidth: 1,
                    borderColor: active ? colors.textMain : colors.border,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "800", color: active ? "white" : colors.textMuted }}>{tab.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {loading ? (
          <View style={{ paddingTop: 60, alignItems: "center" }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : entries.length === 0 ? (
          <View style={{ paddingTop: 60, alignItems: "center" }}>
            <Text style={{ fontSize: 15, fontWeight: "800", color: colors.textMuted }}>No activity yet.</Text>
          </View>
        ) : (
          <View style={{ backgroundColor: colors.card, borderRadius: 28, borderWidth: 1, borderColor: colors.border, padding: 24, gap: 28, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 20, elevation: 2 }}>
            {entries.map((act, idx, arr) => {
              const dotColor = ACTION_COLORS[act.action?.toLowerCase()] || colors.primary;
              const RowComponent = act.image_url ? TouchableOpacity : View;
              const rowProps = act.image_url ? { onPress: () => setPreviewImage(act.image_url!) } : {};
              const timeStr = act.created_at ? new Date(act.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";
              const dateStr = act.created_at ? new Date(act.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";

              return (
                <RowComponent key={act.id || idx} style={{ flexDirection: "row", gap: 16, position: "relative", alignItems: "center" }} {...rowProps}>
                  {idx < arr.length - 1 && (
                    <View style={{ position: "absolute", left: 7, top: 20, width: 2, bottom: -28, backgroundColor: colors.border }} />
                  )}
                  <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: dotColor, borderWidth: 3, borderColor: "white", marginTop: 2, zIndex: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: "800", color: colors.textMain, lineHeight: 20, marginBottom: 4, letterSpacing: -0.2 }}>
                      {formatActivityDescription(act)}
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>
                      {dateStr ? `${dateStr} at ${timeStr}` : timeStr} • {act.recorded_by || "Staff"} → now {formatForDisplay(act.resulting_qty, act.unit)}
                    </Text>
                  </View>
                  {act.image_url && (
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: `${colors.primary}10`, alignItems: "center", justifyContent: "center" }}>
                      <Maximize2 size={16} color={colors.primary} />
                    </View>
                  )}
                </RowComponent>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
