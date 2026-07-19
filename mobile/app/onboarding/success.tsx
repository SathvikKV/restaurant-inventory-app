import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Check, Users, FileText, Menu } from "lucide-react-native";
import { MiseLogo, colors } from "../../components/ui";

const SUMMARY = [
  { Icon: Users, title: "Team Connected", desc: "Kitchen, Billing, Manager" },
  { Icon: FileText, title: "Invoice Uploaded", desc: "We've learned your inventory" },
  { Icon: Menu, title: "Menu Uploaded", desc: "We've created your recipes" },
];

export default function SuccessScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 80, paddingBottom: 48, justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ alignItems: "center", width: "100%" }}>
          <MiseLogo size="small" />

          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginTop: 32, marginBottom: 24, shadowColor: colors.primary, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 5, position: "relative" }}>
            <Check size={40} color="white" strokeWidth={2.5} />
            <View style={{ position: "absolute", top: 0, left: -16, width: 8, height: 8, borderRadius: 4, backgroundColor: "#E8F0EC" }} />
            <View style={{ position: "absolute", top: -16, right: 16, width: 12, height: 12, borderRadius: 6, backgroundColor: "#A2C384" }} />
            <View style={{ position: "absolute", bottom: 16, right: -24, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.border }} />
          </View>

          <Text style={{ fontSize: 28, fontWeight: "800", color: colors.textMain, letterSpacing: -0.5, marginBottom: 12 }}>You're all set!</Text>
          <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: "600", textAlign: "center", lineHeight: 22, marginBottom: 40, maxWidth: 280 }}>
            MISE has learned your restaurant and is ready to help you manage inventory, purchases and more.
          </Text>

          <View style={{ width: "100%", gap: 12 }}>
            {SUMMARY.map(({ Icon, title, desc }, idx) => (
              <View key={idx} style={{ backgroundColor: "#F7F7F8", borderRadius: 24, padding: 16, flexDirection: "row", alignItems: "center", gap: 16, borderWidth: 1, borderColor: colors.border }}>
                <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: "white", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
                  <Icon size={20} color={colors.primary} strokeWidth={2} />
                </View>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: "800", color: colors.textMain, marginBottom: 2 }}>{title}</Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: "600" }}>{desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity
          onPress={() => router.replace("/(app)/home")}
          activeOpacity={0.85}
          style={{ width: "100%", backgroundColor: colors.primary, borderRadius: 24, paddingVertical: 18, alignItems: "center", shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 4 }}
        >
          <Text style={{ color: "white", fontSize: 17, fontWeight: "800", letterSpacing: -0.3 }}>Go to Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
