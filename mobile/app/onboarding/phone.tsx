import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { requestOTP } from "../../lib/api";

export default function PhoneScreen() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSendOTP() {
    if (phone.length < 10) return;
    setLoading(true);
    try {
      const fullPhone = `+91${phone}`;
      const result = await requestOTP(fullPhone);
      // In mock mode, auto-fill OTP for convenience
      router.push({
        pathname: "/onboarding/otp",
        params: { phone: fullPhone, mockOtp: result.mock_otp || "" },
      });
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

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
              Enter your phone number
            </Text>
            <Text className="text-kosh-textMuted text-[16px] mb-10 font-medium leading-relaxed">
              We'll send you a one-time code to verify your number.
            </Text>
            <View className="flex-row gap-4 mb-6">
              <View className="bg-white rounded-[20px] px-5 py-[18px] flex-row items-center gap-2 border border-kosh-border">
                <Text className="text-xl">🇮🇳</Text>
                <Text className="font-bold text-kosh-textMain text-[17px]">+91</Text>
              </View>
              <View className="flex-1 bg-white rounded-[20px] px-5 py-[18px] border border-kosh-border">
                <TextInput
                  placeholder="98765 43210"
                  placeholderTextColor="#687076"
                  value={phone}
                  onChangeText={(t) => setPhone(t.replace(/\D/g, "").slice(0, 10))}
                  keyboardType="phone-pad"
                  className="text-kosh-textMain text-[17px] font-bold"
                  autoFocus
                />
              </View>
            </View>
            <Text className="text-[13px] text-kosh-textMuted font-medium px-2">
              We'll never share your number.
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleSendOTP}
            disabled={phone.length < 10 || loading}
            className="w-full bg-kosh-primary py-[18px] rounded-full items-center"
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="white" />
              : <Text className="text-white font-bold text-[17px]">Send OTP</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
