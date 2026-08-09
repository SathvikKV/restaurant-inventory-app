import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft, User } from "lucide-react-native";
import { updateMe } from "../../lib/api";
import { saveAuth, loadAuth } from "../../lib/auth-store";
import { colors } from "../../components/ui";
import { resetStackAndNavigate } from "../../lib/nav";

export default function OnboardingNameScreen() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    if (!name.trim()) {
      Alert.alert("Required", "Please enter your name to continue.");
      return;
    }
    setLoading(true);
    try {
      const auth = loadAuth();
      if (!auth.token) throw new Error("Not authenticated");
      
      await updateMe(auth.token, name.trim());
      await saveAuth({
        ...auth,
        userName: name.trim(),
      });

      if (auth.needsRestaurantSelection) {
        router.push("/onboarding/create-restaurant");
      } else {
        resetStackAndNavigate("/(app)/(tabs)/home");
      }
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save your name");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 48, justifyContent: "space-between" }}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 24, marginLeft: -12 }}
            >
              <ChevronLeft size={24} color={colors.textMain} strokeWidth={2} />
            </TouchableOpacity>

            <Text style={{ fontSize: 32, fontWeight: "800", color: colors.textMain, textAlign: "center", letterSpacing: -0.5, lineHeight: 40, marginBottom: 12 }}>
              What's your name?
            </Text>
            <Text style={{ fontSize: 15, color: colors.textMuted, fontWeight: "600", textAlign: "center", lineHeight: 22, marginBottom: 40, maxWidth: 260, alignSelf: "center" }}>
              We use this to personalize your greetings and tag your activity logs.
            </Text>

            <View style={{ gap: 12 }}>
              <View style={{ backgroundColor: "white", borderRadius: 24, paddingHorizontal: 20, paddingVertical: 16, flexDirection: "row", alignItems: "center", gap: 16, borderWidth: 1, borderColor: colors.border, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 20, elevation: 1 }}>
                <User size={22} color={colors.textMuted} strokeWidth={2} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textMuted, marginBottom: 2 }}>Your Full Name</Text>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. Sathvik Vadavatha"
                    placeholderTextColor={colors.textMuted}
                    autoFocus
                    autoCapitalize="words"
                    style={{ fontSize: 16, fontWeight: "800", color: colors.textMain, padding: 0 }}
                  />
                </View>
              </View>
            </View>
          </ScrollView>

          <TouchableOpacity
            onPress={handleContinue}
            disabled={loading || !name.trim()}
            activeOpacity={0.8}
            style={{
              backgroundColor: !name.trim() || loading ? "#9CA3AF" : colors.primary,
              borderRadius: 24,
              paddingVertical: 18,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 10,
              elevation: 3,
            }}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={{ color: "white", fontSize: 17, fontWeight: "800" }}>Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
