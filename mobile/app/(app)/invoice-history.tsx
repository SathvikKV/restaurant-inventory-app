import { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, Modal, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft, AlertCircle, Receipt, FileText, X, Maximize2 } from "lucide-react-native";
import { useAuth } from "../../lib/auth-context";
import { getPurchaseOrders, getIssues } from "../../lib/api";
import { colors } from "../../components/ui";
import { ImagePreviewModal } from "../../components/ImagePreviewModal";
import { formatForDisplay } from "../../lib/units";

type DocumentItem = {
  id: string;
  type: "invoice" | "indent";
  title: string;
  subtitle: string;
  amount_or_summary: string;
  status: string;
  date_label: string;
  created_at?: string;
  image_url?: string;
};

export default function InvoiceHistoryScreen() {
  const { auth } = useAuth();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "invoices" | "indents">("all");
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.token) return;
    (async () => {
      setLoading(true);
      try {
        const [posRes, issRes] = await Promise.allSettled([
          getPurchaseOrders(auth.token!),
          getIssues(auth.token!),
        ]);

        const items: DocumentItem[] = [];

        if (posRes.status === "fulfilled" && Array.isArray(posRes.value)) {
          posRes.value.forEach((inv: any) => {
            items.push({
              id: inv.id,
              type: "invoice",
              title: inv.supplier_name || "Unknown Supplier",
              subtitle: inv.item_name ? (inv.quantity != null && inv.unit != null ? `${inv.item_name} (${formatForDisplay(inv.quantity, inv.unit)})` : inv.item_name) : "Invoice Order",
              amount_or_summary: inv.total_amount ? `₹${(inv.total_amount / 100).toLocaleString("en-IN")}` : `#${inv.id?.slice(-4)}`,
              status: inv.status || "active",
              date_label: inv.date_label || "Recent",
              created_at: inv.created_at || "",
              image_url: inv.image_url,
            });
          });
        }

        if (issRes.status === "fulfilled" && Array.isArray(issRes.value)) {
          issRes.value.forEach((iss: any) => {
            items.push({
              id: iss.id,
              type: "indent",
              title: iss.destination || iss.outlet || "Stock KOT",
              subtitle: iss.items_summary || "Issued Stock",
              amount_or_summary: iss.indent_number ? `KOT #${iss.indent_number}` : `#${iss.id?.slice(-4)}`,
              status: iss.status || "active",
              date_label: iss.date_label || "Recent",
              created_at: iss.created_at || "",
              image_url: iss.image_url,
            });
          });
        }

        items.sort((a, b) => {
          const dtA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dtB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dtB - dtA;
        });

        setDocuments(items);
      } finally {
        setLoading(false);
      }
    })();
  }, [auth.token]);

  const filteredDocs = documents.filter(d => {
    if (activeTab === "invoices") return d.type === "invoice";
    if (activeTab === "indents") return d.type === "indent";
    return true;
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F7F8" }}>
      {/* Image Preview Modal */}
      <ImagePreviewModal
        visible={!!previewImage}
        imageUri={previewImage}
        onClose={() => setPreviewImage(null)}
      />

      {/* Top Bar */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>
        <TouchableOpacity onPress={() => router.navigate("/(app)/(tabs)/more" as any)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}>
          <ChevronLeft size={24} color={colors.textMain} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        <Text style={{ fontSize: 34, fontWeight: "800", color: colors.textMain, letterSpacing: -1, marginBottom: 16 }}>Invoices & KOTs</Text>

        {/* Filter Tabs */}
        <View style={{ flexDirection: "row", backgroundColor: "#EAECEF", padding: 4, borderRadius: 16, marginBottom: 24, alignSelf: "flex-start" }}>
          {(["all", "invoices", "indents"] as const).map((tab) => {
            const isSelected = activeTab === tab;
            const label = tab === "all" ? "All Documents" : tab === "invoices" ? "Invoices" : "KOTs";
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  backgroundColor: isSelected ? "white" : "transparent",
                  shadowColor: isSelected ? "#000" : "transparent",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isSelected ? 0.08 : 0,
                  shadowRadius: 2,
                  elevation: isSelected ? 1 : 0,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: isSelected ? "800" : "600", color: isSelected ? colors.textMain : colors.textMuted }}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? (
          <View style={{ paddingTop: 60, alignItems: "center" }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : filteredDocs.length === 0 ? (
          <View style={{ paddingTop: 60, alignItems: "center" }}>
            <Text style={{ fontSize: 15, fontWeight: "800", color: colors.textMuted }}>No records found.</Text>
          </View>
        ) : (
          <View style={{ backgroundColor: colors.card, borderRadius: 28, borderWidth: 1, borderColor: colors.border, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 20, elevation: 2 }}>
            {filteredDocs.map((doc, idx) => {
              const isInvoice = doc.type === "invoice";
              const needsReview = doc.status === "pending";
              return (
                <View
                  key={`${doc.type}-${doc.id}`}
                  style={{ padding: 20, borderBottomWidth: idx < filteredDocs.length - 1 ? 1 : 0, borderBottomColor: colors.border, flexDirection: "row", alignItems: "center", gap: 16 }}
                >
                  {/* Thumbnail / Photo Trigger */}
                  <TouchableOpacity
                    onPress={() => {
                      if (doc.image_url) {
                        setPreviewImage(doc.image_url);
                      }
                    }}
                    activeOpacity={doc.image_url ? 0.6 : 1}
                    style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: isInvoice ? "#F4F5F7" : "#F0FDF4", alignItems: "center", justifyContent: "center", overflow: "hidden", borderWidth: 1, borderColor: colors.border }}
                  >
                    {doc.image_url ? (
                      <>
                        <Image source={{ uri: doc.image_url }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                        <View style={{ position: "absolute", bottom: 2, right: 2, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 8, padding: 2 }}>
                          <Maximize2 size={10} color="white" />
                        </View>
                      </>
                    ) : isInvoice ? (
                      <Receipt size={22} color={colors.textMuted} strokeWidth={2} />
                    ) : (
                      <FileText size={22} color="#059669" strokeWidth={2} />
                    )}
                  </TouchableOpacity>

                  {/* Text Details */}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <Text style={{ fontSize: 16, fontWeight: "800", color: colors.textMain, letterSpacing: -0.2, flexShrink: 1 }} numberOfLines={1}>
                        {doc.title}
                      </Text>
                      <View style={{ backgroundColor: isInvoice ? "#F3E8FF" : "#DCFCE7", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: "800", color: isInvoice ? "#7C3AED" : "#15803D", textTransform: "uppercase" }}>
                          {doc.type}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textMuted }} numberOfLines={1}>
                      {doc.subtitle} • {doc.date_label}
                    </Text>
                  </View>

                  {/* Right Column: Amount & Status */}
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontSize: 15, fontWeight: "800", color: colors.textMain, marginBottom: 4 }}>
                      {doc.amount_or_summary}
                    </Text>
                    <View style={{ backgroundColor: needsReview ? "#EFF6FF" : "#ECFDF5", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 }}>
                      <Text style={{ fontSize: 11, fontWeight: "800", color: needsReview ? "#2563EB" : "#059669", letterSpacing: 0.5 }}>
                        {needsReview ? "Review" : "Recorded"}
                      </Text>
                    </View>
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
