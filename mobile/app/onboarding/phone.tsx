import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft, ChevronDown } from "lucide-react-native";
import { requestOTP } from "../../lib/api";
import { colors } from "../../components/ui";

const COUNTRY_CODES = [
  { code: "+91", label: "India" },
  { code: "+1", label: "US/Canada" },
  { code: "+44", label: "UK" },
  { code: "+971", label: "UAE" },
];

export default function PhoneScreen() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [countryCode, setCountryCode] = useState("+91");
  const [pickerOpen, setPickerOpen] = useState(false);

  async function handleContinue() {
    if (phone.length < 10) return;
    setLoading(true);
    try {
      await requestOTP(`${countryCode}${phone}`);
      router.push({ pathname: "/onboarding/otp", params: { phone: `${countryCode}${phone}` } });
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
              <TouchableOpacity onPress={() => setPickerOpen(true)} style={{
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
                <Text style={{ fontSize: 16, fontWeight: "800", color: colors.textMain }}>{countryCode}</Text>
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
                  onChangeText={t => setPhone(t.replace(/\D/g, "").slice(0, 15))}
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

      <Modal visible={pickerOpen} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "white", padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", marginBottom: 16, color: colors.textMain }}>Select Country Code</Text>
            {COUNTRY_CODES.map((item) => (
              <TouchableOpacity
                key={item.code}
                onPress={() => { setCountryCode(item.code); setPickerOpen(false); }}
                style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}
              >
                <Text style={{ fontSize: 16, color: colors.textMain, fontWeight: "600" }}>{item.label} ({item.code})</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => setPickerOpen(false)}
              style={{ marginTop: 16, alignItems: "center", paddingVertical: 12 }}
            >
              <Text style={{ fontSize: 16, color: colors.textMuted, fontWeight: "800" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
