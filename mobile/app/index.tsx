import { useEffect } from "react";
import { View, Text } from "react-native";
import { router } from "expo-router";

export default function SplashScreen() {
  useEffect(() => {
    // Clear any stale auth state on app start
    const { clearAuth, loadAuth } = require("../lib/auth-store");
    const auth = loadAuth();
    if (auth.token) {
      // Verify token is still valid by checking if it exists
      // For now clear on every restart to avoid stale tokens
      clearAuth();
    }
    const timer = setTimeout(() => {
      router.replace("/onboarding/welcome");
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View className="flex-1 bg-kosh-bg items-center justify-center">
      <BrandLogo />
      <Text className="mt-5 text-kosh-textMuted text-[15px] font-medium tracking-tight">
        Your restaurant's copilot
      </Text>
    </View>
  );
}

function BrandLogo() {
  return (
    <View className="items-center">
      <View className="flex-row items-center gap-[6px] mb-3">
        <View className="w-5 h-12 bg-[#0E2818] rounded-[6px]" />
        <View className="gap-[3px]">
          <View className="w-3 h-[10px] bg-[#A2C384] rounded-[2px]" />
          <View className="w-3 h-[10px] bg-[#F2EDE2] rounded-[2px]" />
          <View className="w-3 h-[10px] bg-[#97AF97] rounded-[2px]" />
          <View className="w-3 h-[10px] bg-[#DBBC83] rounded-[2px]" />
        </View>
      </View>
      <Text className="text-[32px] font-bold tracking-tight text-kosh-primary">
        MISE
      </Text>
    </View>
  );
}
