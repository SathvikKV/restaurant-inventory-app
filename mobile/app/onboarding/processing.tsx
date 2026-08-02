import { useLocalSearchParams, router } from "expo-router";
import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Check } from "lucide-react-native";
import { MiseLogo, colors } from "../../components/ui";
import { uploadMenu } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";

export default function ProcessingScreen() {
  const { imageUri, mimeType } = useLocalSearchParams<{ imageUri?: string; mimeType?: string }>();
  const { auth } = useAuth();
  const [stepLabel, setStepLabel] = useState("Reading invoice");

  useEffect(() => {
    (async () => {
      if (!imageUri || !auth.token) {
        router.replace({ pathname: "/onboarding/success", params: { itemCount: "0" } });
        return;
      }
      try {
        setStepLabel("Reading menu");
        const res = await uploadMenu(auth.token, imageUri, mimeType || "image/jpeg");
        
        router.replace({
          pathname: "/onboarding/review-recipes",
          params: { recipesJson: JSON.stringify(res.recipes || []) },
        });
      } catch (e: any) {
        router.replace({ pathname: "/onboarding/success", params: { itemCount: "0", error: e.message || "Failed to process menu" } });
      }
    })();
  }, []);

  const STEPS = ["Reading menu", "Learning inventory requirements"];
  const activeStep = stepLabel === "Reading menu" ? 0 : 1;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
      <View style={{ flex: 1, paddingHorizontal: 32, paddingTop: 80, paddingBottom: 48, alignItems: "center", justifyContent: "center" }}>
        <MiseLogo size="small" />

        <View style={{ width: 80, height: 80, marginTop: 40, marginBottom: 32, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>

        <Text style={{ fontSize: 26, fontWeight: "800", color: colors.textMain, textAlign: "center", letterSpacing: -0.5, lineHeight: 34, marginBottom: 12 }}>
          SANQ is learning{"\n"}your restaurant
        </Text>
        <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: "600", textAlign: "center", marginBottom: 48 }}>
          This usually takes less than a minute.
        </Text>

        <View style={{ width: "100%", maxWidth: 260, gap: 16 }}>
          {STEPS.map((step, idx) => {
            const isComplete = idx < activeStep;
            const isActive = idx === activeStep;
            return (
              <View key={idx} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", opacity: isComplete || isActive ? 1 : 0.4 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ width: 16, height: 16, alignItems: "center", justifyContent: "center" }}>
                    {isActive ? (
                      <ActivityIndicator size="small" color={colors.textMuted} />
                    ) : isComplete ? (
                      <Check size={16} color={colors.primary} strokeWidth={2.5} />
                    ) : (
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textMuted }} />
                    )}
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: isComplete ? "800" : "600", color: isComplete ? colors.textMain : colors.textMuted }}>{step}</Text>
                </View>
                {isComplete && <Check size={16} color={colors.primary} strokeWidth={2.5} />}
              </View>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}
