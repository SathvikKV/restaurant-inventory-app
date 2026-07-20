import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft, MessageCircle, User } from "lucide-react-native";
import { colors } from "../../components/ui";

const ROLES = [
  { title: "Kitchen Staff", tag: "Required", desc: "Send bills and indents", action: "Connect WhatsApp", primary: true, Icon: MessageCircle },
  { title: "Billing Person", tag: "Required", desc: "Share customer bills", action: "Connect WhatsApp", primary: true, Icon: MessageCircle },
  { title: "Manager", tag: "Optional", desc: "Approve and manage", action: "Invite on WhatsApp", primary: false, Icon: User },
];

export default function ConnectTeamScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F7F8" }}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 48 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 24, marginLeft: -12 }}
        >
          <ChevronLeft size={24} color={colors.textMain} strokeWidth={2} />
        </TouchableOpacity>

        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          <Text style={{ fontSize: 28, fontWeight: "800", color: colors.textMain, textAlign: "center", letterSpacing: -0.5, lineHeight: 36, marginBottom: 8 }}>
            Connect your team{"\n"}on WhatsApp
          </Text>
          <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: "600", textAlign: "center", marginBottom: 32 }}>
            SANQ works where your team works.
          </Text>

          <View style={{ gap: 12 }}>
            {ROLES.map((role, idx) => (
              <View key={idx} style={{ backgroundColor: "white", borderRadius: 24, borderWidth: 1, borderColor: colors.border, padding: 20, flexDirection: "row", alignItems: "flex-start", gap: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 20, elevation: 2 }}>
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "#ECFDF5", borderWidth: 1, borderColor: "#D1FAE5", alignItems: "center", justifyContent: "center" }}>
                  <role.Icon size={22} color="#059669" strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <Text style={{ fontSize: 15, fontWeight: "800", color: colors.textMain }}>{role.title}</Text>
                    <View style={{ backgroundColor: "#F4F5F7", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100, borderWidth: 1, borderColor: colors.border }}>
                      <Text style={{ fontSize: 10, fontWeight: "800", color: colors.textMuted }}>{role.tag}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: "600", marginBottom: 16 }}>{role.desc}</Text>
                  <TouchableOpacity style={{ paddingVertical: 10, borderRadius: 100, backgroundColor: role.primary ? colors.primary : "white", borderWidth: role.primary ? 0 : 1.5, borderColor: colors.primary, alignItems: "center" }}>
                    <Text style={{ fontSize: 13, fontWeight: "800", color: role.primary ? "white" : colors.primary }}>{role.action}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        <TouchableOpacity
          onPress={() => router.push("/onboarding/upload-invoice")}
          activeOpacity={0.85}
          style={{ backgroundColor: colors.primary, borderRadius: 24, paddingVertical: 18, alignItems: "center", marginTop: 24, shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 4 }}
        >
          <Text style={{ color: "white", fontSize: 17, fontWeight: "800", letterSpacing: -0.3 }}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
