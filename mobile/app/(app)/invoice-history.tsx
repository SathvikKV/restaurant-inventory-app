import { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "../../lib/auth-context";
import { getPurchaseOrders } from "../../lib/api";

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      return `Today, ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
    } else if (diffDays === 1) {
      return `Yesterday, ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
    }
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  } catch {
    return iso;
  }
}

export default function InvoiceHistoryScreen() {
  const { auth } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (!auth.token) throw new Error("Not authenticated");
        const data = await getPurchaseOrders(auth.token);
        setInvoices(Array.isArray(data) ? data : []);
      } catch (e: any) {
        setError(e.message || "Failed to load invoices");
      } finally {
        setLoading(false);
      }
    })();
  }, [auth.token]);

  return (
    <SafeAreaView className="flex-1 bg-kosh-bg">
      <View className="px-5 pt-4 pb-2">
        <TouchableOpacity
          onPress={() => router.navigate("/(app)/more")}
          className="w-10 h-10 -ml-2 rounded-full items-center justify-center mb-4"
        >
          <Text className="text-[28px] text-kosh-textMain">‹</Text>
        </TouchableOpacity>
        <Text className="text-[24px] font-bold text-kosh-textMain mb-4">Invoice History</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1B4D36" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-red-500 text-center font-medium">{error}</Text>
        </View>
      ) : invoices.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-kosh-textMuted text-[15px]">No invoices yet</Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
          <View className="bg-white rounded-2xl border border-kosh-border overflow-hidden mb-8">
            {invoices.map((inv: any, idx: number) => {
              const requiresReview = inv.status === "pending";
              const itemCount = Array.isArray(inv.items) ? inv.items.length : (inv.item_count ?? 0);
              const amount = typeof inv.total_amount === "number"
                ? `₹${inv.total_amount.toLocaleString()}`
                : inv.total_amount ?? "—";
              return (
                <TouchableOpacity
                  key={inv.id}
                  className={`px-4 py-4 flex-row items-center gap-3 ${idx < invoices.length - 1 ? "border-b border-kosh-border" : ""}`}
                >
                  <View className={`w-10 h-10 rounded-xl items-center justify-center ${requiresReview ? "bg-blue-50" : "bg-kosh-bg"}`}>
                    <Text className="text-xl">{requiresReview ? "⚠️" : "🧾"}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-[14px] font-semibold text-kosh-textMain">
                      {inv.supplier ?? inv.supplier_name ?? "Unknown Supplier"}
                    </Text>
                    <Text className="text-[12px] text-kosh-textMuted">
                      {inv.id} · {formatDate(inv.created_at)}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-[14px] font-bold text-kosh-textMain">{amount}</Text>
                    <Text className="text-[11px] font-medium" style={{ color: requiresReview ? "#3B82F6" : "#22C55E" }}>
                      {requiresReview ? "Needs Review" : "Recorded"}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
