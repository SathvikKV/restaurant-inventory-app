import { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useAuth } from "../../lib/auth-context";
import { getAuditLog } from "../../lib/api";
import { colors } from "../../components/ui";

const FILTERS = ["Bills", "Invoices", "Indents", "Adjustments", "Waste", "Issues"];
const TYPE_COLORS: Record<string, string> = {
  purchase: "#059669",
  invoice: "#059669",
  wastage: "#DC2626",
  waste: "#DC2626",
  issue: "#111418",
  adjust: "#7C3AED",
};

export default function ActivityHistoryScreen() {
  const { auth } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  useEffect(() => {
    if (!auth.token) return;
    (async () => {
      try {
        const result = await getAuditLog(auth.token!, 50);
        setEntries(result.entries || []);
      } catch {}
      finally { setLoading(false); }
    })();
  }, [auth.token]);

  const toggleFilter = (f: string) => {
    setActiveFilters(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F7F8" }}>
      {/* Nav */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}>
          <ChevronLeft size={24} color={colors.textMain} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        <Text style={{ fontSize: 36, fontWeight: "800", color: colors.textMain, letterSpacing: -1, marginBottom: 24 }}>Activity</Text>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {FILTERS.map(f => {
              const active = activeFilters.includes(f);
              return (
                <TouchableOpacity
                  key={f}
                  onPress={() => toggleFilter(f)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 100,
                    backgroundColor: active ? colors.textMain : colors.card,
                    borderWidth: 1,
                    borderColor: active ? colors.textMain : colors.border,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "800", color: active ? "white" : colors.textMuted }}>{f}</Text>
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
              const dotColor = TYPE_COLORS[act.type?.toLowerCase()] || colors.primary;
              return (
                <View key={act.id || idx} style={{ flexDirection: "row", gap: 20, position: "relative" }}>
                  {idx < arr.length - 1 && (
                    <View style={{ position: "absolute", left: 7, top: 20, width: 2, bottom: -28, backgroundColor: colors.border }} />
                  )}
                  <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: dotColor, borderWidth: 3, borderColor: "white", marginTop: 2, zIndex: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: "800", color: colors.textMain, lineHeight: 20, marginBottom: 4, letterSpacing: -0.2 }}>
                      {act.description || `${act.type || "Activity"} recorded`}
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>
                      {act.created_at ? new Date(act.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"} • {act.recorded_by || "Staff"}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
