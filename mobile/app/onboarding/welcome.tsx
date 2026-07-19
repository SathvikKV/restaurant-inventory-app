import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { User, ArrowRight } from "lucide-react-native";
import { MiseLogo, colors } from "../../components/ui";

function StorefrontIllustration() {
  return (
    <View style={{ width: 240, height: 160, alignItems: "center", justifyContent: "flex-end" }}>
      {/* Awning */}
      <View style={{ width: 240, height: 36, backgroundColor: "#1B4D36", borderRadius: 4, marginBottom: 0, flexDirection: "row", overflow: "hidden" }}>
        {[0,1,2,3,4,5].map(i => (
          <View key={i} style={{ flex: 1, backgroundColor: i % 2 === 0 ? "#1B4D36" : "#2B8A5A" }} />
        ))}
      </View>
      {/* Front */}
      <View style={{ width: 240, height: 100, backgroundColor: "#F4F5F7", borderWidth: 1, borderColor: "#EAECEF", flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 16, paddingBottom: 0 }}>
        {/* Windows */}
        <View style={{ flex: 1, height: 60, backgroundColor: "#E8F0EC", borderRadius: 4, marginRight: 8, borderWidth: 1, borderColor: "#D1E5DA" }} />
        <View style={{ flex: 1, height: 60, backgroundColor: "#E8F0EC", borderRadius: 4, borderWidth: 1, borderColor: "#D1E5DA" }} />
        {/* Doors */}
        <View style={{ flexDirection: "row", gap: 8, marginLeft: 8 }}>
          <View style={{ width: 24, height: 50, backgroundColor: "#1B4D36", borderRadius: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#A2C384", position: "absolute", right: 4, top: 20 }} />
          </View>
          <View style={{ width: 24, height: 50, backgroundColor: "#2B8A5A", borderRadius: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#A2C384", position: "absolute", left: 4, top: 20 }} />
          </View>
        </View>
      </View>
      {/* Ground */}
      <View style={{ width: 240, height: 4, backgroundColor: "#EAECEF", borderRadius: 2 }} />
    </View>
  );
}

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 80, paddingBottom: 48, justifyContent: "space-between" }}>
        <View style={{ alignItems: "center" }}>
          <MiseLogo size="hero" />
          <View style={{ marginTop: 48, marginBottom: 48 }}>
            <StorefrontIllustration />
          </View>
          <Text style={{ fontSize: 22, fontWeight: "800", color: colors.textMain, textAlign: "center", letterSpacing: -0.5, lineHeight: 30 }}>
            Manage your restaurant{"\n"}operations with ease.
          </Text>
        </View>

        <View style={{ gap: 16 }}>
          <TouchableOpacity
            onPress={() => router.push("/onboarding/phone")}
            activeOpacity={0.85}
            style={{
              backgroundColor: colors.primary,
              borderRadius: 24,
              paddingVertical: 18,
              alignItems: "center",
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 20,
              elevation: 4,
            }}
          >
            <Text style={{ color: "white", fontSize: 17, fontWeight: "800", letterSpacing: -0.3 }}>Sign in with Mobile</Text>
          </TouchableOpacity>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 16, opacity: 0.6 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.textMuted }} />
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textMuted }}>or</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.textMuted }} />
          </View>

          <TouchableOpacity
            onPress={() => router.push("/onboarding/phone")}
            activeOpacity={0.7}
            style={{
              backgroundColor: "white",
              borderRadius: 24,
              paddingVertical: 18,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <User size={18} color={colors.textMuted} strokeWidth={2} />
            <Text style={{ fontSize: 15, fontWeight: "800", color: colors.textMain }}>Already signed in? Go to Home</Text>
            <ArrowRight size={16} color={colors.textMuted} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
