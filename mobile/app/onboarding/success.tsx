import { View, Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SuccessScreen() {
  return (
    <SafeAreaView className="flex-1 bg-kosh-bg">
      <View className="flex-1 px-6 pt-36 pb-12 justify-between items-center">
        <View className="items-center w-full">
          <View className="w-28 h-28 bg-white shadow-sm border border-kosh-border rounded-[32px] items-center justify-center mb-10">
            <Text className="text-5xl">✅</Text>
          </View>
          <Text className="text-[36px] font-bold text-kosh-textMain mb-4">
            You're all set!
          </Text>
          <Text className="text-kosh-textMuted text-[17px] font-medium leading-relaxed text-center max-w-[280px]">
            Your restaurant is ready. Let's take you to your command center.
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.replace("/(app)/home")}
          className="w-full bg-kosh-primary py-[18px] rounded-full items-center"
          activeOpacity={0.85}
        >
          <Text className="text-white font-bold text-[17px]">Go to Dashboard</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
