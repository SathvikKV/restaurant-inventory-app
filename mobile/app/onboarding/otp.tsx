import { useState, useRef, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { verifyOTP } from "../../lib/api";
import { saveAuth } from "../../lib/auth-store";

export default function OtpScreen() {
  const { phone, mockOtp } = useLocalSearchParams<{ phone: string; mockOtp: string }>();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);

  // Auto-fill mock OTP in dev mode
  useEffect(() => {
    if (mockOtp && mockOtp.length === 6) {
      setOtp(mockOtp.split(""));
    }
  }, [mockOtp]);

  const handleChange = (val: string, idx: number) => {
    const cleaned = val.replace(/\D/g, "");
    const updated = [...otp];
    updated[idx] = cleaned.slice(-1);
    setOtp(updated);
    if (cleaned && idx < 5) {
      inputs.current[idx + 1]?.focus();
    }
  };

  async function handleVerify() {
    const code = otp.join("");
    if (code.length < 6) return;
    setLoading(true);
    try {
      const result = await verifyOTP(phone, code);
      await saveAuth({
        token: result.access_token,
        userId: result.user_id,
        role: result.role,
        tenantId: result.tenant_id,
        schema: result.schema,
        restaurantName: null,
        needsRestaurantSelection: result.needs_restaurant_selection,
      });
      if (result.needs_restaurant_selection) {
        router.push("/onboarding/create-restaurant");
      } else {
        router.replace("/(app)/home");
      }
    } catch (e: any) {
      Alert.alert("Error", e.message || "Invalid OTP");
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
              className="w-10 h-10 -ml-2 rounded-full items-center justify-center mb-6"
            >
              <Text className="text-[28px] text-kosh-textMain">‹</Text>
            </TouchableOpacity>
            <Text className="text-[32px] font-bold text-kosh-textMain mb-4">
              Enter OTP
            </Text>
            <Text className="text-kosh-textMuted text-[16px] mb-10 font-medium leading-relaxed">
              We've sent a 6-digit code to {phone}.
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
            onPress={handleVerify}
            disabled={otp.join("").length < 6 || loading}
            className="w-full bg-kosh-primary py-[18px] rounded-full items-center"
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="white" />
              : <Text className="text-white font-bold text-[17px]">Verify</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
