import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft, ChevronDown } from "lucide-react-native";
import { requestOTP } from "../../lib/api";
import { colors } from "../../components/ui";

export default function PhoneScreen() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    if (phone.length < 10) return;
    setLoading(true);
    try {
      await requestOTP(`+91${phone}`);
      router.push({ pathname: "/onboarding/otp", params: { phone: `+91${phone}` } });
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to send OTP");
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

            <Text style={{ fontSize: 28, fontWeight: "800", color: colors.textMain, textAlign: "center", letterSpacing: -0.5, lineHeight: 36, marginBottom: 12 }}>
              Enter your{"\n"}mobile number
            </Text>
            <Text style={{ fontSize: 15, color: colors.textMuted, fontWeight: "600", textAlign: "center", lineHeight: 22, marginBottom: 40, maxWidth: 240, alignSelf: "center" }}>
              We'll send you an OTP to verify your number
            </Text>

            <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
              <TouchableOpacity style={{
                backgroundColor: "white",
                borderRadius: 20,
                paddingHorizontal: 16,
                paddingVertical: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                borderWidth: 1,
                borderColor: colors.border,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.03,
                shadowRadius: 20,
                elevation: 1,
              }}>
                <Text style={{ fontSize: 16, fontWeight: "800", color: colors.textMain }}>+91</Text>
                <ChevronDown size={16} color={colors.textMuted} strokeWidth={2} />
              </TouchableOpacity>

              <View style={{
                flex: 1,
                backgroundColor: "white",
                borderRadius: 20,
                paddingHorizontal: 20,
                paddingVertical: 16,
                borderWidth: 1,
                borderColor: colors.border,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.03,
                shadowRadius: 20,
                elevation: 1,
              }}>
                <TextInput
                  value={phone}
                  onChangeText={t => setPhone(t.replace(/\D/g, "").slice(0, 10))}
                  placeholder="Enter mobile number"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  autoFocus
                  style={{ fontSize: 16, fontWeight: "800", color: colors.textMain, padding: 0 }}
                />
              </View>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleContinue}
            disabled={phone.length < 10 || loading}
            activeOpacity={0.85}
            style={{
              backgroundColor: phone.length < 10 ? "#A0ADB4" : colors.primary,
              borderRadius: 24,
              paddingVertical: 18,
              alignItems: "center",
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: phone.length < 10 ? 0 : 0.3,
              shadowRadius: 20,
              elevation: phone.length < 10 ? 0 : 4,
            }}
          >
            <Text style={{ color: "white", fontSize: 17, fontWeight: "800", letterSpacing: -0.3 }}>
              {loading ? "Sending..." : "Continue"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
