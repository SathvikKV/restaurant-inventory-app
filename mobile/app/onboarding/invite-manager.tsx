import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function InviteManagerScreen() {
  return (
    <SafeAreaView className="flex-1 bg-kosh-bg">
      <View className="flex-1 px-6 pt-28 pb-12 justify-between">
        <View className="items-center">
          <View className="w-28 h-28 bg-white shadow-sm rounded-[32px] items-center justify-center mb-10 border border-kosh-border">
            <Text className="text-5xl">👥</Text>
          </View>
          <Text className="text-[32px] font-bold text-kosh-textMain mb-4 text-center">
            Invite your manager
          </Text>
          <Text className="text-kosh-textMuted text-[16px] mb-12 font-medium leading-relaxed text-center">
            They will help you manage daily operations.
          </Text>
          <TextInput
            placeholder="Manager's Phone"
            defaultValue="+91 81234 56789"
            keyboardType="phone-pad"
            className="w-full bg-white rounded-[20px] px-5 py-[18px] text-kosh-textMain font-bold text-[17px] border border-kosh-border text-center"
          />
        </View>
        <View className="gap-4">
          <TouchableOpacity
            onPress={() => router.push("/onboarding/success")}
            className="w-full bg-kosh-primary py-[18px] rounded-full items-center"
            activeOpacity={0.85}
          >
            <Text className="text-white font-bold text-[17px]">Send Invitation</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/onboarding/success")}
            className="w-full py-4 items-center"
            activeOpacity={0.85}
          >
            <Text className="text-kosh-textMuted font-bold text-[15px]">Skip for now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
