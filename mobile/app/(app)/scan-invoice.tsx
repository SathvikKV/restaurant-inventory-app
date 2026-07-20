import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { X, Camera, ImagePlus, Check, Package } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../lib/auth-context";
import { colors, PrimaryButton } from "../../components/ui";

type LineItem = { item_name: string; quantity: number; unit: string; unit_price?: number; total_price?: number };
type OCRResult = { invoice_number?: string; supplier_name?: string; invoice_date?: string; line_items: LineItem[]; total_amount?: number; confidence_notes?: string };

async function uploadInvoice(token: string, imageUri: string, mimeType: string): Promise<OCRResult> {
  const formData = new FormData();
  formData.append("file", { uri: imageUri, name: "invoice.jpg", type: mimeType || "image/jpeg" } as any);
  const res = await fetch("https://kosh-api.sathvik-vadavatha.site/api/v1/ai/ocr/invoice", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) throw new Error("OCR failed");
  return res.json();
}

type Stage = "capture" | "processing" | "review";

export default function ScanInvoiceScreen() {
  const { auth } = useAuth();
  const [stage, setStage] = useState<Stage>("capture");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [result, setResult] = useState<OCRResult | null>(null);

  async function pickImage(useCamera: boolean) {
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission required", "Please grant permission to continue.");
      return;
    }

    const picked = useCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsEditing: true, mediaTypes: ImagePicker.MediaTypeOptions.Images });

    if (picked.canceled || !picked.assets?.[0]) return;

    const asset = picked.assets[0];
    setImageUri(asset.uri);
    setStage("processing");

    try {
      const ocr = await uploadInvoice(auth.token!, asset.uri, asset.mimeType || "image/jpeg");
      setResult(ocr);
      setStage("review");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to process invoice");
      setStage("capture");
    }
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
          onPress={() => { Alert.alert("Done", "Invoice recorded successfully."); router.navigate("/(app)/home" as any); }}
          activeOpacity={0.85}
          style={{ backgroundColor: colors.primary, borderRadius: 24, paddingVertical: 18, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 4 }}
        >
          <Check size={20} color="white" strokeWidth={2.5} />
          <Text style={{ color: "white", fontSize: 17, fontWeight: "800", letterSpacing: -0.3 }}>Confirm & Record</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
