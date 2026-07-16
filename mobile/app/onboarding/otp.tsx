import { useState, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OtpScreen() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputs = useRef<(TextInput | null)[]>([]);

  const handleChange = (val: string, idx: number) => {
    const cleaned = val.replace(/\D/g, "");
    const updated = [...otp];
    updated[idx] = cleaned.slice(-1);
    setOtp(updated);
    if (cleaned && idx < 5) {
      inputs.current[idx + 1]?.focus();
    } else if (idx === 5 && cleaned) {
      setTimeout(() => router.push("/onboarding/create-restaurant"), 400);
    }
  };

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
              Enter OTP
            </Text>
            <Text className="text-kosh-textMuted text-[16px] mb-10 font-medium leading-relaxed">
              We've sent a 6-digit code to your number.
            </Text>
            <View className="flex-row gap-3 justify-between mb-8">
              {otp.map((digit, idx) => (
                <TextInput
                  key={idx}
                  ref={(el) => (inputs.current[idx] = el)}
                  value={digit}
                  onChangeText={(v) => handleChange(v, idx)}
                  keyboardType="number-pad"
                  maxLength={1}
                  className="w-[46px] h-[56px] bg-white rounded-[16px] text-center text-[22px] font-bold text-kosh-textMain border border-kosh-border"
                />
              ))}
            </View>
            <Text className="text-center text-[15px] text-kosh-textMuted font-medium">
              Resend OTP in 0:25
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/onboarding/create-restaurant")}
            disabled={otp.join("").length < 6}
            className="w-full bg-kosh-primary py-[18px] rounded-full items-center"
            activeOpacity={0.85}
          >
            <Text className="text-white font-bold text-[17px]">Verify</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
