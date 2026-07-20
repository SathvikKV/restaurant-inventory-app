import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

// TODO: Wire OCR flow:
// 1. Use expo-image-picker to select invoice photo
// 2. POST /api/v1/ai/ocr/invoice with the image file
// 3. Display extracted line items for review
// 4. On confirm: POST /api/v1/purchase-orders with confirmed items

type OCRItem = { name: string; qty: number; unit: string; price: number };

const MOCK_OCR_RESULT: OCRItem[] = [
  { name: "Tomatoes", qty: 20, unit: "kg", price: 50 },
  { name: "Onions", qty: 25, unit: "kg", price: 40 },
  { name: "Coriander Leaves", qty: 2, unit: "kg", price: 80 },
  { name: "Lemons", qty: 100, unit: "pcs", price: 5 },
];

type Stage = "upload" | "reviewing" | "confirmed";

export default function ScanInvoiceScreen() {
  const [stage, setStage] = useState<Stage>("upload");
  const [items] = useState<OCRItem[]>(MOCK_OCR_RESULT);

  return (
    <SafeAreaView className="flex-1 bg-kosh-bg">
      <View className="px-5 pt-4">
        <TouchableOpacity
          onPress={() => router.navigate("/(app)/more" as any)}
          className="w-10 h-10 -ml-2 rounded-full items-center justify-center mb-4"
        >
          <Text className="text-[28px] text-kosh-textMain">‹</Text>
        </TouchableOpacity>
        <Text className="text-[24px] font-bold text-kosh-textMain mb-1">Scan Invoice</Text>
        <Text className="text-kosh-textMuted text-[14px] mb-6">Upload an invoice to extract items automatically</Text>
      </View>

      {stage === "upload" && (
        <View className="flex-1 px-5">
          {/* WhatsApp instruction */}
          <View className="bg-white rounded-2xl p-5 border border-kosh-border mb-4">
            <View className="flex-row items-center gap-3 mb-4">
              <Text className="text-3xl">📱</Text>
              <View className="flex-1">
                <Text className="text-[15px] font-bold text-kosh-textMain">Send via WhatsApp</Text>
                <Text className="text-[13px] text-kosh-textMuted">Photo auto-processes instantly</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-2 bg-kosh-bg rounded-xl px-4 py-3">
              <Text className="text-[13px] text-kosh-textMuted font-medium flex-1">Waiting for WhatsApp image...</Text>
              <View className="w-2 h-2 rounded-full" style={{ backgroundColor: "#4ADE80" }} />
            </View>
          </View>

          <View className="flex-row items-center gap-3 mb-4">
            <View className="flex-1" style={{ height: 1, backgroundColor: "#EAECEF" }} />
            <Text className="text-[13px] text-kosh-textMuted font-medium">or</Text>
            <View className="flex-1" style={{ height: 1, backgroundColor: "#EAECEF" }} />
          </View>

          {/* Upload from gallery — simulated */}
          <TouchableOpacity
            onPress={() => setStage("reviewing")}
            className="bg-white rounded-2xl p-5 border border-kosh-border items-center"
          >
            <Text className="text-4xl mb-3">📷</Text>
            <Text className="text-[15px] font-bold text-kosh-textMain mb-1">Upload from Gallery</Text>
            <Text className="text-[13px] text-kosh-textMuted">JPEG or PNG invoice image</Text>
          </TouchableOpacity>
        </View>
      )}

      {stage === "reviewing" && (
        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
          <View className="bg-white rounded-2xl p-4 border border-kosh-border mb-4">
            <View className="flex-row items-center gap-2 mb-4">
              <Text className="text-kosh-accent text-lg">✓</Text>
              <Text className="text-[14px] font-bold text-kosh-textMain">Extracted {items.length} items</Text>
              <Text className="text-[13px] text-kosh-textMuted" style={{ marginLeft: "auto" }}>Invoice #INV-1246</Text>
            </View>
            {items.map((item, idx) => (
              <View
                key={idx}
                className={`flex-row items-center py-3 ${idx < items.length - 1 ? "border-b border-kosh-border" : ""}`}
              >
                <View className="flex-1">
                  <Text className="text-[14px] font-semibold text-kosh-textMain">{item.name}</Text>
                  <Text className="text-[12px] text-kosh-textMuted">{item.qty} {item.unit} · ₹{item.price}/{item.unit}</Text>
                </View>
                <Text className="text-[14px] font-bold text-kosh-textMain">₹{item.qty * item.price}</Text>
              </View>
            ))}
            <View className="mt-3 pt-3 border-t border-kosh-border flex-row justify-between">
              <Text className="text-[14px] font-bold text-kosh-textMain">Total</Text>
              <Text className="text-[14px] font-bold text-kosh-textMain">
                ₹{items.reduce((s, i) => s + i.qty * i.price, 0).toLocaleString()}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => setStage("confirmed")}
            className="w-full bg-kosh-primary py-[18px] rounded-full items-center mb-3"
            activeOpacity={0.85}
          >
            <Text className="text-white font-bold text-[17px]">Confirm and Save</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setStage("upload")}
            className="w-full py-4 items-center"
          >
            <Text className="text-kosh-textMuted font-bold text-[15px]">Retake Photo</Text>
          </TouchableOpacity>
          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      {stage === "confirmed" && (
        <View className="flex-1 px-5 items-center justify-center">
          <View className="w-24 h-24 bg-white rounded-[28px] border border-kosh-border items-center justify-center mb-6">
            <Text className="text-5xl">✅</Text>
          </View>
          <Text className="text-[26px] font-bold text-kosh-textMain mb-2">Invoice Saved</Text>
          <Text className="text-kosh-textMuted text-[15px] text-center mb-8">
            {items.length} items have been recorded and inventory updated.
          </Text>
          <TouchableOpacity
            onPress={() => router.navigate("/(app)/more")}
            className="w-full bg-kosh-primary py-[18px] rounded-full items-center"
            activeOpacity={0.85}
          >
            <Text className="text-white font-bold text-[17px]">Done</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
