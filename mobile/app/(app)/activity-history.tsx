import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

// TODO: Replace mock data with:
// GET /api/v1/reports/audit-log?limit=50 -> activity entries

const ACTIVITIES = [
  { type: "purchase", icon: "📦", title: "Invoice recorded", subtitle: "KY Vegetables · 8 items · ₹4,200", time: "9:41 AM", user: "Ramesh" },
  { type: "issue", icon: "📤", title: "Stock issued", subtitle: "Chicken Breast · 5kg → Kitchen", time: "9:15 AM", user: "Ramesh" },
  { type: "wastage", icon: "🗑️", title: "Wastage logged", subtitle: "Paneer · 2kg · Spoiled", time: "8:30 AM", user: "Ramesh" },
  { type: "purchase", icon: "📦", title: "Invoice recorded", subtitle: "Fresh Dairy · 5 items · ₹6,800", time: "7:15 AM", user: "Ramesh" },
  { type: "adjust", icon: "✏️", title: "Stock adjusted", subtitle: "Tomatoes · 8kg → 3kg · Count correction", time: "Yesterday", user: "Aditya" },
  { type: "issue", icon: "📤", title: "Stock issued", subtitle: "Basmati Rice · 10kg → Kitchen", time: "Yesterday", user: "Ramesh" },
  { type: "purchase", icon: "📦", title: "Invoice recorded", subtitle: "United Meats · 3 items · ₹12,500", time: "Yesterday", user: "Ramesh" },
];

const TYPE_COLORS: Record<string, string> = {
  purchase: "#F0FDF4",
  issue: "#EFF6FF",
  wastage: "#FEF2F2",
  adjust: "#FFFBEB",
};

export default function ActivityHistoryScreen() {
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

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        <View className="bg-white rounded-2xl border border-kosh-border overflow-hidden mb-8">
          {ACTIVITIES.map((act, idx) => (
            <View
              key={idx}
              className={`px-4 py-4 flex-row items-center gap-3 ${idx < ACTIVITIES.length - 1 ? "border-b border-kosh-border" : ""}`}
            >
              <View
                className="w-10 h-10 rounded-xl items-center justify-center"
                style={{ backgroundColor: TYPE_COLORS[act.type] || "#F4F5F7" }}
              >
                <Text className="text-xl">{act.icon}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-[14px] font-semibold text-kosh-textMain">{act.title}</Text>
                <Text className="text-[12px] text-kosh-textMuted">{act.subtitle}</Text>
              </View>
              <View className="items-end">
                <Text className="text-[11px] text-kosh-textMuted">{act.time}</Text>
                <Text className="text-[11px] text-kosh-textMuted">{act.user}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
