import { View, Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function WelcomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-kosh-bg">
      <View className="flex-1 px-8 pt-16 pb-14 justify-between">
        <View>
          <Text className="text-[40px] font-bold text-kosh-primary mb-5 leading-[1.1]">
            Welcome to MISE
          </Text>
          <Text className="text-kosh-textMuted text-[17px] mb-12 font-medium leading-relaxed">
            The AI operating system for restaurant inventory and purchasing.
          </Text>
          <View className="gap-8">
            <View className="flex-row items-center gap-5">
              <View className="w-12 h-12 rounded-[20px] bg-white shadow-sm items-center justify-center">
                <Text className="text-2xl">📦</Text>
              </View>
              <Text className="text-[17px] font-semibold text-kosh-textMain flex-1">
                Manage inventory with ease
              </Text>
            </View>
            <View className="flex-row items-center gap-5">
              <View className="w-12 h-12 rounded-[20px] bg-white shadow-sm items-center justify-center">
                <Text className="text-2xl">📄</Text>
              </View>
              <Text className="text-[17px] font-semibold text-kosh-textMain flex-1">
                Make smarter decisions
              </Text>
            </View>
            <View className="flex-row items-center gap-5">
              <View className="w-12 h-12 rounded-[20px] bg-white shadow-sm items-center justify-center">
                <Text className="text-2xl">✨</Text>
              </View>
              <Text className="text-[17px] font-semibold text-kosh-textMain flex-1">
                Get AI insights every day
              </Text>
            </View>
          </View>
        </View>
        <View>
          <TouchableOpacity
            onPress={() => router.push("/onboarding/phone")}
            className="w-full bg-kosh-primary py-[18px] rounded-full items-center"
            activeOpacity={0.85}
          >
            <Text className="text-white font-bold text-[17px]">Get Started</Text>
          </TouchableOpacity>
          <Text className="text-center mt-6 text-[15px] text-kosh-textMuted font-medium">
            Already have an account?{" "}
            <Text
              onPress={() => router.push("/onboarding/phone")}
              className="text-kosh-primary font-bold underline"
            >
              Log in
            </Text>
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
