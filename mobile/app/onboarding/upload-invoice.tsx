import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft, Upload, Lock } from "lucide-react-native";
import { colors } from "../../components/ui";

export default function UploadInvoiceScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 48, justifyContent: "space-between" }}>
        <View>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 16, marginLeft: -12 }}>
            <ChevronLeft size={24} color={colors.textMain} strokeWidth={2} />
          </TouchableOpacity>

          <Text style={{ fontSize: 28, fontWeight: "800", color: colors.textMain, textAlign: "center", letterSpacing: -0.5, marginBottom: 12 }}>Teach MISE</Text>
          <Text style={{ fontSize: 15, color: colors.textMuted, fontWeight: "600", textAlign: "center", lineHeight: 22, marginBottom: 32, maxWidth: 260, alignSelf: "center" }}>
            Upload a recent supplier invoice.{"\n"}MISE will learn your inventory,{"\n"}suppliers, units and pricing.
          </Text>

          {/* Upload zone */}
          <TouchableOpacity style={{ borderWidth: 2, borderStyle: "dashed", borderColor: colors.border, borderRadius: 32, backgroundColor: "#F7F7F8", alignItems: "center", justifyContent: "center", paddingVertical: 40, marginBottom: 24 }}>
            <View style={{ width: 80, height: 96, backgroundColor: "white", borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", marginBottom: 24, position: "relative" }}>
              <View style={{ width: 40, height: 3, backgroundColor: colors.border, borderRadius: 2, position: "absolute", top: 24, left: 16 }} />
              <View style={{ width: 24, height: 3, backgroundColor: colors.border, borderRadius: 2, position: "absolute", top: 36, left: 16 }} />
              <View style={{ width: 40, height: 3, backgroundColor: colors.border, borderRadius: 2, position: "absolute", top: 48, left: 16 }} />
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, position: "absolute", bottom: -12, right: -12, alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: "#F7F7F8" }}>
                <Upload size={16} color="white" strokeWidth={2} />
              </View>
            </View>
            <Text style={{ fontSize: 17, fontWeight: "800", color: colors.textMain, marginBottom: 8 }}>Upload Invoice</Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: "600" }}>Take a clear photo or upload PDF</Text>
          </TouchableOpacity>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, justifyContent: "center" }}>
            <Lock size={18} color="#059669" strokeWidth={2} />
            <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: "600", lineHeight: 18 }}>
              Your data is private and secure{"\n"}Only you can see your data.
            </Text>
          </View>
        </View>

        <View style={{ gap: 12 }}>
          <TouchableOpacity onPress={() => router.push("/onboarding/processing")} activeOpacity={0.85} style={{ backgroundColor: colors.primary, borderRadius: 24, paddingVertical: 18, alignItems: "center", shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 4 }}>
            <Text style={{ color: "white", fontSize: 17, fontWeight: "800", letterSpacing: -0.3 }}>Upload Invoice</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/onboarding/processing")} style={{ paddingVertical: 12, alignItems: "center" }}>
            <Text style={{ fontSize: 15, fontWeight: "800", color: colors.textMain }}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
