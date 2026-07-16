import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

// TODO: Replace mock data with:
// GET /api/v1/purchase-orders -> invoices list
// GET /api/v1/purchase-orders/{id} -> invoice detail

const INVOICES = [
  { id: "INV-1245", supplier: "KY Vegetables", date: "Today, 9:41 AM", items: 8, amount: "₹4,200", status: "Recorded", requiresReview: false },
  { id: "INV-1244", supplier: "Fresh Dairy Co.", date: "Today, 7:15 AM", items: 5, amount: "₹6,800", status: "Needs Review", requiresReview: true },
  { id: "INV-1243", supplier: "United Meats", date: "Yesterday, 6:30 PM", items: 3, amount: "₹12,500", status: "Recorded", requiresReview: false },
  { id: "INV-1242", supplier: "APMC Traders", date: "Yesterday, 2:00 PM", items: 12, amount: "₹8,100", status: "Recorded", requiresReview: false },
  { id: "INV-1241", supplier: "Beverage Dist.", date: "13 Jul, 10:00 AM", items: 4, amount: "₹2,200", status: "Recorded", requiresReview: false },
];

export default function InvoiceHistoryScreen() {
  return (
    <SafeAreaView className="flex-1 bg-kosh-bg">
      <View className="px-5 pt-4 pb-2">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 -ml-2 rounded-full items-center justify-center mb-4"
        >
          <Text className="text-[28px] text-kosh-textMain">‹</Text>
        </TouchableOpacity>
        <Text className="text-[24px] font-bold text-kosh-textMain mb-4">Invoice History</Text>
      </View>

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        <View className="bg-white rounded-2xl border border-kosh-border overflow-hidden mb-8">
          {INVOICES.map((inv, idx) => (
            <TouchableOpacity
              key={inv.id}
              className={`px-4 py-4 flex-row items-center gap-3 ${idx < INVOICES.length - 1 ? "border-b border-kosh-border" : ""}`}
            >
              <View className={`w-10 h-10 rounded-xl items-center justify-center ${inv.requiresReview ? "bg-blue-50" : "bg-kosh-bg"}`}>
                <Text className="text-xl">{inv.requiresReview ? "⚠️" : "🧾"}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-[14px] font-semibold text-kosh-textMain">{inv.supplier}</Text>
                <Text className="text-[12px] text-kosh-textMuted">{inv.id} · {inv.date}</Text>
              </View>
              <View className="items-end">
                <Text className="text-[14px] font-bold text-kosh-textMain">{inv.amount}</Text>
                <Text
                  className="text-[11px] font-medium"
                  style={{ color: inv.requiresReview ? "#3B82F6" : "#22C55E" }}
                >
                  {inv.status}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
