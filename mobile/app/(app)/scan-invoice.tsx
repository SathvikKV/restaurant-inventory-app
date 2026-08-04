import { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { X, Camera, ImagePlus, Check, Package, HelpCircle } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../lib/auth-context";
import { saveOCRInvoice, uploadInvoice, previewMatch, OCRResult, LineItem, PreviewMatchResult } from "../../lib/api";
import { colors, PrimaryButton } from "../../components/ui";

type Stage = "capture" | "processing" | "review" | "recorded";

export default function ScanInvoiceScreen() {
  const { auth } = useAuth();
  const [stage, setStage] = useState<Stage>("capture");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [previewResults, setPreviewResults] = useState<PreviewMatchResult[]>([]);
  const [resolutions, setResolutions] = useState<Record<string, { same: boolean; target_item_id?: string }>>({});
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setStage("capture");
      setImageUri(null);
      setResult(null);
      setPreviewResults([]);
      setResolutions({});
      setSaving(false);
      return () => {};
    }, [])
  );

  const reviewNeeded = previewResults.filter((p) => p.match_status === "needs_review");
  const isAllResolved = reviewNeeded.every((item) => resolutions[item.item_name] !== undefined);

  async function handleConfirm() {
    if (!result || !auth.token || stage === "recorded" || !isAllResolved) return;
    setSaving(true);
    try {
      const res = await saveOCRInvoice(auth.token, result, resolutions);
      setStage("recorded");
      const msg = res.new_items_created.length > 0
        ? `Invoice recorded. New item(s) added: ${res.new_items_created.join(", ")}`
        : "Invoice recorded successfully.";
      Alert.alert("Done", msg, [{ text: "OK", onPress: () => router.replace("/(app)/home" as any) }]);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save invoice. Please try again.");
      setSaving(false);
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
        const ocr = await uploadInvoice(auth.token!, asset.uri, asset.mimeType || "image/jpeg");
        setResult(ocr);
        try {
          const previews = await previewMatch(auth.token!, ocr.line_items || []);
          setPreviewResults(previews);
        } catch (err: any) {
          console.error("Preview match failed, defaulting to empty:", err);
          setPreviewResults([]);
        }
        setResolutions({});
        setStage("review");
      } catch (e: any) {
        Alert.alert("Error", e.message || "Failed to process invoice");
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
        <Text style={{ fontSize: 15, color: colors.textMuted, textAlign: "center", fontWeight: "600", marginBottom: 32 }}>Invoice has been saved and inventory updated successfully.</Text>
        <PrimaryButton label="Back to Home" onPress={() => router.replace("/(app)/home" as any)} />
      </SafeAreaView>
    );
  }

  if (stage === "capture") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F7F8" }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>
          <TouchableOpacity onPress={() => router.navigate("/(app)/more" as any)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}>
            <X size={22} color={colors.textMain} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={{ fontSize: 17, fontWeight: "800", color: colors.textMain }}>Scan Invoice</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40, gap: 16 }}>
          <Text style={{ fontSize: 28, fontWeight: "800", color: colors.textMain, letterSpacing: -0.5, marginBottom: 8 }}>Add Invoice</Text>
          <Text style={{ fontSize: 15, color: colors.textMuted, fontWeight: "600", marginBottom: 24, lineHeight: 22 }}>Take a photo or upload from your library. SANQ will extract the items automatically.</Text>

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
        <Text style={{ fontSize: 20, fontWeight: "800", color: colors.textMain, letterSpacing: -0.3 }}>Reading invoice...</Text>
        <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: "600" }}>SANQ is extracting items</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F7F8" }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>
        <TouchableOpacity onPress={() => setStage("capture")} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}>
          <X size={22} color={colors.textMain} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: "800", color: colors.textMain }}>Review Invoice</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}>
        {/* Supplier info */}
        <View style={{ backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: colors.border, padding: 20, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 20, elevation: 2 }}>
          <Text style={{ fontSize: 13, fontWeight: "800", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Supplier</Text>
          <Text style={{ fontSize: 20, fontWeight: "800", color: colors.textMain, letterSpacing: -0.3 }}>{result?.supplier_name || "Unknown Supplier"}</Text>
          {result?.invoice_number && <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: "600", marginTop: 4 }}>Invoice #{result.invoice_number}</Text>}
        </View>

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
        <Text style={{ fontSize: 17, fontWeight: "800", color: colors.textMain, marginBottom: 12, paddingHorizontal: 4, letterSpacing: -0.3 }}>Extracted Items</Text>
        <View style={{ backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: colors.border, overflow: "hidden", marginBottom: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 20, elevation: 2 }}>
          {(result?.line_items || []).map((item, idx, arr) => (
            <View key={idx} style={{ padding: 16, borderBottomWidth: idx < arr.length - 1 ? 1 : 0, borderBottomColor: colors.border, flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#F4F5F7", alignItems: "center", justifyContent: "center" }}>
                <Package size={20} color={colors.textMuted} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "800", color: colors.textMain, marginBottom: 2 }}>{item.item_name}</Text>
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textMuted }}>{item.quantity} {item.unit}{item.unit_price ? ` · ₹${item.unit_price}/${item.unit}` : ""}</Text>
              </View>
              {item.total_price && <Text style={{ fontSize: 15, fontWeight: "800", color: colors.textMain }}>₹{item.total_price}</Text>}
            </View>
          ))}
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
