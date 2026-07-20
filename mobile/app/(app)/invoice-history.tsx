import { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft, AlertCircle, Receipt } from "lucide-react-native";
import { useAuth } from "../../lib/auth-context";
import { getPurchaseOrders } from "../../lib/api";
import { colors } from "../../components/ui";

export default function InvoiceHistoryScreen() {
  const { auth } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.token) return;
    (async () => {
      try {
        const data = await getPurchaseOrders(auth.token!);
        setInvoices(data);
      } catch {}
      finally { setLoading(false); }
    })();
  }, [auth.token]);

  function formatDate(dateStr: string) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHrs = diffMs / (1000 * 60 * 60);
    if (diffHrs < 24) return `Today, ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    if (diffHrs < 48) return `Yesterday`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F7F8" }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>
        <TouchableOpacity onPress={() => router.navigate("/(app)/more" as any)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}>
          <ChevronLeft size={24} color={colors.textMain} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        <Text style={{ fontSize: 36, fontWeight: "800", color: colors.textMain, letterSpacing: -1, marginBottom: 24 }}>Invoices</Text>

        {loading ? (
          <View style={{ paddingTop: 60, alignItems: "center" }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : invoices.length === 0 ? (
          <View style={{ paddingTop: 60, alignItems: "center" }}>
            <Text style={{ fontSize: 15, fontWeight: "800", color: colors.textMuted }}>No invoices yet.</Text>
          </View>
        ) : (
          <View style={{ backgroundColor: colors.card, borderRadius: 28, borderWidth: 1, borderColor: colors.border, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 20, elevation: 2 }}>
            {invoices.map((inv, idx) => {
              const needsReview = inv.status === "pending";
              return (
                <TouchableOpacity
                  key={inv.id}
                  activeOpacity={0.7}
                  style={{ padding: 20, borderBottomWidth: idx < invoices.length - 1 ? 1 : 0, borderBottomColor: colors.border, flexDirection: "row", alignItems: "center", gap: 16 }}
                >
                  <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: needsReview ? "#EFF6FF" : "#F4F5F7", alignItems: "center", justifyContent: "center" }}>
                    {needsReview ? <AlertCircle size={22} color="#2563EB" strokeWidth={2} /> : <Receipt size={22} color={colors.textMuted} strokeWidth={2} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: "800", color: colors.textMain, marginBottom: 4, letterSpacing: -0.2 }}>{inv.supplier_name || "Unknown Supplier"}</Text>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textMuted }}>{formatDate(inv.created_at)}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontSize: 15, fontWeight: "800", color: colors.textMain, marginBottom: 4 }}>#{inv.id?.slice(-4) || "—"}</Text>
                    <View style={{ backgroundColor: needsReview ? "#EFF6FF" : "#ECFDF5", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 }}>
                      <Text style={{ fontSize: 11, fontWeight: "800", color: needsReview ? "#2563EB" : "#059669", letterSpacing: 0.5 }}>{needsReview ? "Review" : "Recorded"}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
