import { useState, useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Check } from "lucide-react-native";
import { MiseLogo, colors } from "../../components/ui";

const STEPS = [
  "Reading invoice",
  "Learning inventory & pricing",
  "Identifying suppliers",
  "Processing menu & recipes",
  "Setting up intelligence",
];

export default function ProcessingScreen() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep(prev => {
        if (prev >= STEPS.length) {
          clearInterval(timer);
          setTimeout(() => router.replace("/onboarding/success"), 500);
          return prev;
        }
        return prev + 1;
      });
    }, 800);
    return () => clearInterval(timer);
  }, []);

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
