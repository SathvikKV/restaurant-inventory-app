import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CreateBranchScreen() {
  return (
    <SafeAreaView className="flex-1 bg-kosh-bg">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 px-6 pt-6 pb-12 justify-between">
          <View>
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-12 h-12 -ml-3 rounded-full items-center justify-center mb-6"
            >
              <Text className="text-[28px] text-kosh-textMain">‹</Text>
            </TouchableOpacity>
            <Text className="text-[32px] font-bold text-kosh-textMain mb-4">
              Add your first branch
            </Text>
            <Text className="text-kosh-textMuted text-[16px] mb-10 font-medium leading-relaxed">
              You can add more branches later.
            </Text>
            <View className="gap-6">
              <View>
                <Text className="text-[13px] font-bold text-kosh-textMuted mb-2.5 ml-1 tracking-wide">
                  BRANCH NAME
                </Text>
                <TextInput
                  defaultValue="Koramangala Branch"
                  className="w-full bg-white rounded-[20px] px-5 py-[18px] text-kosh-textMain font-bold text-[17px] border border-kosh-border"
                />
              </View>
              <View>
                <Text className="text-[13px] font-bold text-kosh-textMuted mb-2.5 ml-1 tracking-wide">
                  ADDRESS (OPTIONAL)
                </Text>
                <TextInput
                  defaultValue="Koramangala, Bangalore"
                  className="w-full bg-white rounded-[20px] px-5 py-[18px] text-kosh-textMain font-bold text-[17px] border border-kosh-border"
                />
              </View>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/onboarding/invite-manager")}
            className="w-full bg-kosh-primary py-[18px] rounded-full items-center"
            activeOpacity={0.85}
          >
            <Text className="text-white font-bold text-[17px]">Save Branch</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
