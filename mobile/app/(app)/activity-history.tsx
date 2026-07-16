import { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { loadAuth } from "../../lib/auth-store";
import { getAuditLog } from "../../lib/api";

const TYPE_COLORS: Record<string, string> = {
  purchase: "#F0FDF4",
  issue: "#EFF6FF",
  wastage: "#FEF2F2",
  adjust: "#FFFBEB",
  receive: "#F0FDF4",
  default: "#F4F5F7",
};

const TYPE_ICONS: Record<string, string> = {
  purchase: "📦",
  issue: "📤",
  wastage: "🗑️",
  adjust: "✏️",
  receive: "📥",
  default: "📋",
};

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return "Yesterday";
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  } catch {
    return iso;
  }
}

export default function ActivityHistoryScreen() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const auth = await loadAuth();
        if (!auth.token) throw new Error("Not authenticated");
        const data = await getAuditLog(auth.token, 50);
        const list = Array.isArray(data) ? data : (data?.entries ?? []);
        setEntries(list);
      } catch (e: any) {
        setError(e.message || "Failed to load activity");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-kosh-bg">
      <View className="px-5 pt-4 pb-2">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 -ml-2 rounded-full items-center justify-center mb-4"
        >
          <Text className="text-[28px] text-kosh-textMain">‹</Text>
        </TouchableOpacity>
        <Text className="text-[24px] font-bold text-kosh-textMain mb-4">Activity Log</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1B4D36" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-red-500 text-center font-medium">{error}</Text>
        </View>
      ) : entries.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-kosh-textMuted text-[15px]">No activity yet</Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
          <View className="bg-white rounded-2xl border border-kosh-border overflow-hidden mb-8">
            {entries.map((act: any, idx: number) => {
              const type = act.action_type ?? act.type ?? "default";
              const icon = TYPE_ICONS[type] ?? TYPE_ICONS.default;
              const bg = TYPE_COLORS[type] ?? TYPE_COLORS.default;
              const title = act.title ?? (type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, " "));
              const subtitle = act.description ?? act.subtitle ?? act.details ?? "";
              const time = act.timestamp ?? act.created_at ?? "";
              const user = act.recorded_by ?? act.user ?? "";
              return (
                <View
                  key={idx}
                  className={`px-4 py-4 flex-row items-center gap-3 ${idx < entries.length - 1 ? "border-b border-kosh-border" : ""}`}
                >
                  <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: bg }}>
                    <Text className="text-xl">{icon}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-[14px] font-semibold text-kosh-textMain">{title}</Text>
                    {!!subtitle && <Text className="text-[12px] text-kosh-textMuted">{subtitle}</Text>}
                  </View>
                  <View className="items-end">
                    {!!time && <Text className="text-[11px] text-kosh-textMuted">{formatTime(time)}</Text>}
                    {!!user && <Text className="text-[11px] text-kosh-textMuted">{user}</Text>}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
