import { useEffect } from "react";
import { View, Text } from "react-native";
import { router } from "expo-router";

import { hydrateAuth, clearAuth } from "../lib/auth-store";
import { getMe } from "../lib/api";

export default function SplashScreen() {
  useEffect(() => {
    (async () => {
      const minDelay = new Promise((r) => setTimeout(r, 1200));
      const auth = await hydrateAuth();

      if (auth.token) {
        try {
          await getMe(auth.token); // throws if expired/invalid
          await minDelay;
          if (!auth.schema || auth.needsRestaurantSelection) {
            router.replace("/onboarding/create-restaurant");
          } else {
            router.replace("/(app)/home");
          }
          return;
        } catch {
          await clearAuth(); // token invalid/expired — fall through to login
        }
      }
      await minDelay;
      router.replace("/onboarding/welcome");
    })();
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
        SANQ
      </Text>
    </View>
  );
}
