import { useState, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { verifyOTP, listRestaurants, selectRestaurant } from "../../lib/api";
import { saveAuth } from "../../lib/auth-store";
import { colors } from "../../components/ui";

export default function OtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);

  const handleOtpChange = (val: string, idx: number) => {
    const cleaned = val.replace(/\D/g, "");
    const updated = [...otp];
    updated[idx] = cleaned.slice(-1);
    setOtp(updated);
    if (cleaned && idx < 5) inputs.current[idx + 1]?.focus();
  };

  const handleKeyPress = (e: any, idx: number) => {
    if (e.nativeEvent.key === "Backspace" && !otp[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  const isComplete = otp.every(c => c.length === 1);

  async function handleVerify() {
    const code = otp.join("");
    if (code.length < 6) return;
    setLoading(true);
    try {
      const result = await verifyOTP(phone, code);
      if (result.needs_restaurant_selection) {
        saveAuth({
          token: result.access_token,
          userId: result.user_id,
          role: result.role,
          tenantId: result.tenant_id,
          schema: result.schema,
          restaurantName: null,
          needsRestaurantSelection: true,
        });
        router.push("/onboarding/create-restaurant");
      } else {
        const baseToken = result.access_token;
        const restaurants = await listRestaurants(baseToken);
        if (!restaurants || restaurants.length === 0) throw new Error("No restaurant found");
        const selected = await selectRestaurant(baseToken, restaurants[0].id);
        saveAuth({
          token: selected.access_token,
          userId: result.user_id,
          role: result.role,
          tenantId: restaurants[0].id,
          schema: selected.schema,
          restaurantName: selected.restaurant_name,
          needsRestaurantSelection: false,
        });
        router.replace("/(app)/home");
      }
    } catch (e: any) {
      Alert.alert("Error", e.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 48, justifyContent: "space-between" }}>
          <View>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 24, marginLeft: -12 }}
            >
              <ChevronLeft size={24} color={colors.textMain} strokeWidth={2} />
            </TouchableOpacity>

            <Text style={{ fontSize: 28, fontWeight: "800", color: colors.textMain, textAlign: "center", letterSpacing: -0.5, marginBottom: 12 }}>Enter OTP</Text>
            <Text style={{ fontSize: 15, color: colors.textMuted, fontWeight: "600", textAlign: "center", lineHeight: 22, marginBottom: 40 }}>
              We've sent a 6-digit code to{"\n"}
              <Text style={{ fontWeight: "800", color: colors.primary }}>{phone}</Text>
            </Text>

            <View style={{ flexDirection: "row", gap: 8, justifyContent: "center", marginBottom: 32 }}>
              {otp.map((char, i) => (
                <TextInput
                  key={i}
                  ref={r => { inputs.current[i] = r; }}
                  value={char}
                  onChangeText={v => handleOtpChange(v, i)}
                  onKeyPress={e => handleKeyPress(e, i)}
                  maxLength={1}
                  keyboardType="number-pad"
                  selectTextOnFocus
                  style={{
                    width: 48,
                    height: 56,
                    backgroundColor: "white",
                    borderRadius: 16,
                    borderWidth: char ? 2 : 1,
                    borderColor: char ? colors.primary : colors.border,
                    textAlign: "center",
                    fontSize: 20,
                    fontWeight: "800",
                    color: colors.textMain,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.03,
                    shadowRadius: 20,
                    elevation: 1,
                  }}
                />
              ))}
            </View>

            <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: "600", textAlign: "center" }}>
              Resend code in <Text style={{ fontWeight: "800", color: colors.textMain }}>00:28</Text>
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleVerify}
            disabled={!isComplete || loading}
            activeOpacity={0.85}
            style={{
              backgroundColor: !isComplete ? "#A0ADB4" : colors.primary,
              borderRadius: 24,
              paddingVertical: 18,
              alignItems: "center",
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: !isComplete ? 0 : 0.3,
              shadowRadius: 20,
              elevation: !isComplete ? 0 : 4,
            }}
          >
            <Text style={{ color: "white", fontSize: 17, fontWeight: "800", letterSpacing: -0.3 }}>
              {loading ? "Verifying..." : "Verify"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
