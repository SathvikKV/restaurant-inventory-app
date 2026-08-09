import { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { X, Camera, ImagePlus, Check, Package, HelpCircle } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../lib/auth-context";
import { saveOCRInvoice, uploadInvoice, previewMatch, classifyDocument, uploadIndent, saveOCRIndent, OCRResult, IndentOCRResult, LineItem, PreviewMatchResult } from "../../lib/api";
import { colors, PrimaryButton } from "../../components/ui";

type Stage = "capture" | "processing" | "review" | "recorded";
type DocType = "supplier_invoice" | "kitchen_indent" | "unknown";

export default function ScanInvoiceScreen() {
  const { auth } = useAuth();
  const [stage, setStage] = useState<Stage>("capture");
  const [docType, setDocType] = useState<DocType>("supplier_invoice");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [indentResult, setIndentResult] = useState<IndentOCRResult | null>(null);
  const [previewResults, setPreviewResults] = useState<PreviewMatchResult[]>([]);
  const [resolutions, setResolutions] = useState<Record<string, { same: boolean; target_item_id?: string }>>({});
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setStage("capture");
      setDocType("supplier_invoice");
      setImageUri(null);
      setResult(null);
      setIndentResult(null);
      setPreviewResults([]);
      setResolutions({});
      setSaving(false);
      return () => {};
    }, [])
  );

  const reviewNeeded = previewResults.filter((p) => p.match_status === "needs_review");
  const isAllResolved = reviewNeeded.every((item) => resolutions[item.item_name] !== undefined);

  function handleUpdateLineItem(idx: number, field: string, value: string) {
    if (docType === "kitchen_indent" && indentResult) {
      const newItems = [...(indentResult.line_items || [])];
      newItems[idx] = { ...newItems[idx], [field]: value };
      setIndentResult({ ...indentResult, line_items: newItems });
    } else if (result) {
      const newItems = [...(result.line_items || [])];
      newItems[idx] = { ...newItems[idx], [field]: value };
      setResult({ ...result, line_items: newItems });
    }
  }

  async function handleConfirm() {
    if (!auth.token || stage === "recorded" || !isAllResolved) return;
    setSaving(true);
    if (docType === "kitchen_indent") {
      if (!indentResult) return;
      try {
        const cleanLineItems = (indentResult.line_items || []).map((i: any) => ({
          ...i,
          quantity: typeof i.quantity === "string" ? parseFloat(i.quantity) || 0 : (i.quantity || 0),
        }));
        const res = await saveOCRIndent(auth.token, {
          section: indentResult.section,
          line_items: cleanLineItems,
          indent_s3_key: indentResult.s3_key,
          resolutions,
        });
        setStage("recorded");
        const acceptedCount = res.accepted.length;
        const deniedCount = res.denied.length;
        const msg = `${acceptedCount} issued, ${deniedCount} need review${deniedCount > 0 ? ` (${res.denied.map(d => d.item).join(", ")})` : ""}.`;
        Alert.alert("Indent Processed", msg, [{ text: "OK", onPress: () => router.replace("/(app)/(tabs)/home" as any) }]);
      } catch (e: any) {
        Alert.alert("Error", e.message || "Failed to save indent. Please try again.");
        setSaving(false);
      }
    } else {
      if (!result) return;
      try {
        const cleanLineItems = (result.line_items || []).map((i: any) => ({
          ...i,
          quantity: typeof i.quantity === "string" ? parseFloat(i.quantity) || 0 : (i.quantity || 0),
          unit_price: typeof i.unit_price === "string" ? Math.round((parseFloat(i.unit_price) || 0) * 100) : Math.round((i.unit_price || 0) * 100),
          total_price: typeof i.total_price === "string" ? Math.round((parseFloat(i.total_price) || 0) * 100) : Math.round((i.total_price || 0) * 100),
        }));
        const totalAmt = result.total_amount ? Math.round(parseFloat(String(result.total_amount)) * 100) : undefined;
        const res = await saveOCRInvoice(auth.token, { ...result, line_items: cleanLineItems, invoice_s3_key: result.s3_key, total_amount: totalAmt }, resolutions);
        setStage("recorded");
        const msg = res.new_items_created.length > 0
          ? `Invoice recorded. New item(s) added: ${res.new_items_created.join(", ")}`
          : "Invoice recorded successfully.";
        Alert.alert("Done", msg, [{ text: "OK", onPress: () => router.replace("/(app)/(tabs)/home" as any) }]);
      } catch (e: any) {
        Alert.alert("Error", e.message || "Failed to save invoice. Please try again.");
        setSaving(false);
      }
    }
  }

  async function pickImage(useCamera: boolean) {
    try {
      const permission = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("Permission required", "Please grant permission to continue.");
        return;
      }

      const picked = useCamera
        ? await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsEditing: true, mediaTypes: ['images'] });

      if (picked.canceled) {
        console.log("[ScanInvoice] Picker was cancelled by user");
        return;
      }
      if (!picked.assets?.[0]) {
        console.log("[ScanInvoice] Picker returned no assets", picked);
        Alert.alert("No photo selected", "Please try again.");
        return;
      }

      const asset = picked.assets[0];
      setImageUri(asset.uri);
      setStage("processing");

      try {
        const classification = await classifyDocument(auth.token!, asset.uri, asset.mimeType || "image/jpeg");
        const type = classification.document_type || "supplier_invoice";
        setDocType(type);

        if (type === "kitchen_indent") {
          const ocr = await uploadIndent(auth.token!, asset.uri, asset.mimeType || "image/jpeg");
          setIndentResult(ocr);
          try {
            const previews = await previewMatch(auth.token!, (ocr.line_items || []) as any);
            setPreviewResults(previews);
          } catch (err: any) {
            console.error("Preview match failed, defaulting to empty:", err);
            setPreviewResults([]);
          }
        } else {
          const ocr = await uploadInvoice(auth.token!, asset.uri, asset.mimeType || "image/jpeg");
          if (ocr.line_items) {
            ocr.line_items = ocr.line_items.map((i: any) => ({
              ...i,
              unit_price: i.unit_price ? (i.unit_price / 100).toString() : undefined,
              total_price: i.total_price ? (i.total_price / 100).toString() : undefined,
            }));
          }
          if (ocr.total_amount) {
            ocr.total_amount = (ocr.total_amount / 100) as any;
          }
          setResult(ocr);
          try {
            const previews = await previewMatch(auth.token!, ocr.line_items || []);
            setPreviewResults(previews);
          } catch (err: any) {
            console.error("Preview match failed, defaulting to empty:", err);
            setPreviewResults([]);
          }
        }
        setResolutions({});
        setStage("review");
      } catch (e: any) {
        Alert.alert("Error", e.message || "Failed to process document");
        setStage("capture");
      }
    } catch (e: any) {
      console.error("[ScanInvoice] Picker failed:", e);
      Alert.alert("Something went wrong", e.message || "Please try again.");
    }
  }

  if (stage === "recorded") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F7F8", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "#E8F0EC", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          <Check size={40} color={colors.primary} strokeWidth={2.5} />
        </View>
        <Text style={{ fontSize: 24, fontWeight: "800", color: colors.textMain, marginBottom: 8 }}>✅ Recorded</Text>
        <Text style={{ fontSize: 15, color: colors.textMuted, textAlign: "center", fontWeight: "600", marginBottom: 32 }}>
          {docType === "kitchen_indent" ? "Kitchen indent has been processed and inventory deducted successfully." : "Invoice has been saved and inventory updated successfully."}
        </Text>
        <PrimaryButton label="Back to Home" onPress={() => router.replace("/(app)/(tabs)/home" as any)} />
      </SafeAreaView>
    );
  }

  if (stage === "capture") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F7F8" }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>
          <TouchableOpacity onPress={() => router.navigate("/(app)/(tabs)/more" as any)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}>
            <X size={22} color={colors.textMain} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={{ fontSize: 17, fontWeight: "800", color: colors.textMain }}>Scan Document</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40, gap: 16 }}>
          <Text style={{ fontSize: 28, fontWeight: "800", color: colors.textMain, letterSpacing: -0.5, marginBottom: 8 }}>Add Invoice or Indent</Text>
          <Text style={{ fontSize: 15, color: colors.textMuted, fontWeight: "600", marginBottom: 24, lineHeight: 22 }}>Take a photo or upload from your library. SANQ will classify the document and extract items automatically.</Text>

          <TouchableOpacity
            onPress={() => pickImage(true)}
            activeOpacity={0.9}
            style={{ backgroundColor: colors.card, borderRadius: 28, borderWidth: 1, borderColor: colors.border, padding: 32, alignItems: "center", gap: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 20, elevation: 2 }}
          >
            <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: "#E8F0EC", alignItems: "center", justifyContent: "center" }}>
              <Camera size={32} color={colors.primary} strokeWidth={2} />
            </View>
            <Text style={{ fontSize: 17, fontWeight: "800", color: colors.textMain }}>Take Photo</Text>
            <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: "600", textAlign: "center" }}>Use your camera to capture the invoice</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => pickImage(false)}
            activeOpacity={0.9}
            style={{ backgroundColor: colors.card, borderRadius: 28, borderWidth: 1, borderColor: colors.border, padding: 32, alignItems: "center", gap: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 20, elevation: 2 }}
          >
            <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: "#F5F3FF", alignItems: "center", justifyContent: "center" }}>
              <ImagePlus size={32} color="#7C3AED" strokeWidth={2} />
            </View>
            <Text style={{ fontSize: 17, fontWeight: "800", color: colors.textMain }}>Upload from Library</Text>
            <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: "600", textAlign: "center" }}>Choose an existing photo or PDF</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (stage === "processing") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "white", alignItems: "center", justifyContent: "center", gap: 24 }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ fontSize: 20, fontWeight: "800", color: colors.textMain, letterSpacing: -0.3 }}>Reading document...</Text>
        <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: "600" }}>SANQ is classifying and extracting items</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F7F8" }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>
        <TouchableOpacity onPress={() => setStage("capture")} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}>
          <X size={22} color={colors.textMain} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: "800", color: colors.textMain }}>{docType === "kitchen_indent" ? "Review Indent" : "Review Invoice"}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}>
        {/* Supplier / Section info */}
        {docType === "kitchen_indent" ? (
          <View style={{ backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: colors.border, padding: 20, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 20, elevation: 2 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View>
                <Text style={{ fontSize: 13, fontWeight: "800", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Kitchen Section</Text>
                <Text style={{ fontSize: 20, fontWeight: "800", color: colors.textMain, letterSpacing: -0.3 }}>{indentResult?.section || "General Kitchen"}</Text>
              </View>
              <View style={{ backgroundColor: "#E8F0EC", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: "800", color: colors.primary, textTransform: "uppercase" }}>Indent</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={{ backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: colors.border, padding: 20, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 20, elevation: 2 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View>
                <Text style={{ fontSize: 13, fontWeight: "800", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Supplier</Text>
                <Text style={{ fontSize: 20, fontWeight: "800", color: colors.textMain, letterSpacing: -0.3 }}>{result?.supplier_name || "Unknown Supplier"}</Text>
                {result?.invoice_number && <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: "600", marginTop: 4 }}>Invoice #{result.invoice_number}</Text>}
              </View>
              <View style={{ backgroundColor: "#F5F3FF", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: "800", color: "#7C3AED", textTransform: "uppercase" }}>Invoice</Text>
              </View>
            </View>
          </View>
        )}

        {/* Match Resolutions needed */}
        {reviewNeeded.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 17, fontWeight: "800", color: "#A16207", marginBottom: 12, paddingHorizontal: 4, letterSpacing: -0.3 }}>
              ⚠️ Action Required: Item Matches ({Object.keys(resolutions).filter(k => reviewNeeded.some(r => r.item_name === k)).length}/{reviewNeeded.length} Resolved)
            </Text>
            <View style={{ backgroundColor: "#FEFCE8", borderRadius: 24, borderWidth: 1, borderColor: "#FEF08A", overflow: "hidden" }}>
              {reviewNeeded.map((conf, idx, arr) => {
                const matchPct = conf.score ? Math.round(conf.score * 100) : 0;
                const res = resolutions[conf.item_name];
                return (
                  <View key={conf.item_name} style={{ padding: 16, borderBottomWidth: idx < arr.length - 1 ? 1 : 0, borderBottomColor: "#FEF08A" }}>
                    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#FEF9C3", alignItems: "center", justifyContent: "center" }}>
                        <HelpCircle size={20} color="#A16207" strokeWidth={2} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: "800", color: colors.textMain, marginBottom: 4 }}>
                          Extracted: {conf.item_name} → Existing: {conf.candidate_name} ({matchPct}% match)
                        </Text>
                        <Text style={{ fontSize: 13, fontWeight: "700", color: "#A16207" }}>
                          {conf.quantity} {conf.unit}
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <TouchableOpacity
                        onPress={() => setResolutions(prev => ({ ...prev, [conf.item_name]: { same: true, target_item_id: conf.candidate_id } }))}
                        style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: res?.same === true ? colors.primary : colors.card, borderWidth: 1, borderColor: res?.same === true ? colors.primary : colors.border, alignItems: "center" }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: "700", color: res?.same === true ? "white" : colors.textMain }}>✓ Same Item</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setResolutions(prev => ({ ...prev, [conf.item_name]: { same: false } }))}
                        style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: res?.same === false ? "#EF4444" : colors.card, borderWidth: 1, borderColor: res?.same === false ? "#EF4444" : colors.border, alignItems: "center" }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: "700", color: res?.same === false ? "white" : colors.textMain }}>✕ Different Item</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Line items */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingHorizontal: 4 }}>
          <Text style={{ fontSize: 17, fontWeight: "800", color: colors.textMain, letterSpacing: -0.3 }}>Extracted Items</Text>
          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.textMuted }}>✏️ Tap quantity to edit</Text>
        </View>
        <View style={{ backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: colors.border, overflow: "hidden", marginBottom: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 20, elevation: 2 }}>
          {(docType === "kitchen_indent" ? indentResult?.line_items || [] : result?.line_items || []).map((item: any, idx: number, arr: any[]) => {
            const isAmbiguous = previewResults.some(p => p.item_name === item.item_name && p.match_status === "needs_review");
            return (
              <View key={idx} style={{ padding: 16, borderBottomWidth: idx < arr.length - 1 ? 1 : 0, borderBottomColor: colors.border, gap: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: isAmbiguous ? "#FFF7ED" : "#F4F5F7", borderWidth: 1, borderColor: isAmbiguous ? "#FED7AA" : colors.border, alignItems: "center", justifyContent: "center" }}>
                      {isAmbiguous ? <HelpCircle size={18} color="#EA580C" /> : <Package size={18} color={colors.textMuted} strokeWidth={2} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: "800", color: colors.textMain }}>{item.item_name}</Text>
                      {isAmbiguous && (
                        <Text style={{ fontSize: 11, fontWeight: "700", color: "#EA580C", marginTop: 2 }}>Needs review — possible match to an existing item</Text>
                      )}
                    </View>
                  </View>
                </View>

                <View style={{ flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: "#F9FAFC", padding: 10, borderRadius: 14, borderWidth: 1, borderColor: "#E2E8F0" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textMuted, marginBottom: 2 }}>Quantity</Text>
                    <TextInput
                      value={String(item.quantity !== undefined && item.quantity !== null ? item.quantity : "")}
                      onChangeText={(val) => handleUpdateLineItem(idx, "quantity", val)}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      style={{ fontSize: 16, fontWeight: "800", color: colors.textMain, backgroundColor: "white", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textMuted, marginBottom: 2 }}>Unit</Text>
                    <TextInput
                      value={String(item.unit || "")}
                      onChangeText={(val) => handleUpdateLineItem(idx, "unit", val)}
                      placeholder="kg/pkt"
                      style={{ fontSize: 15, fontWeight: "700", color: colors.textMain, backgroundColor: "white", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}
                    />
                  </View>
                  {docType === "supplier_invoice" && (
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textMuted, marginBottom: 2 }}>Total (₹)</Text>
                      <TextInput
                        value={String(item.total_price !== undefined && item.total_price !== null ? item.total_price : "")}
                        onChangeText={(val) => handleUpdateLineItem(idx, "total_price", val)}
                        keyboardType="decimal-pad"
                        placeholder="₹0"
                        style={{ fontSize: 15, fontWeight: "700", color: colors.textMain, backgroundColor: "white", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}
                      />
                    </View>
                  )}
                </View>

                {/* Price-mismatch warning — must be visible before user confirms */}
                {docType === "supplier_invoice" && item.flagged_for_review && item.flag_reason && (
                  <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#FEF3C7", borderRadius: 10, borderWidth: 1, borderColor: "#FCD34D", paddingHorizontal: 12, paddingVertical: 8 }}>
                    <Text style={{ fontSize: 14, lineHeight: 18 }}>⚠️</Text>
                    <Text style={{ flex: 1, fontSize: 12, fontWeight: "700", color: "#92400E", lineHeight: 18 }}>
                      {item.flag_reason}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Confirm button */}
      <View style={{ position: "absolute", bottom: 24, left: 24, right: 24 }}>
        <TouchableOpacity
          onPress={handleConfirm}
          disabled={saving || !isAllResolved}
          activeOpacity={0.85}
          style={{ backgroundColor: !isAllResolved ? "#A1A1A9" : colors.primary, borderRadius: 24, paddingVertical: 18, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, shadowColor: !isAllResolved ? "#000" : colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 4 }}
        >
          {saving ? <ActivityIndicator color="white" /> : <Check size={20} color="white" strokeWidth={2.5} />}
          <Text style={{ color: "white", fontSize: 17, fontWeight: "800", letterSpacing: -0.3 }}>
            {saving ? "Recording..." : !isAllResolved ? "Resolve Matches to Continue" : "Confirm & Record"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
