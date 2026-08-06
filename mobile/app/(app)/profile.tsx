import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowLeft, User, Phone, Shield, Save } from "lucide-react-native";
import { useAuth } from "../../lib/auth-context";
import { getMe, updateMe } from "../../lib/api";
import { saveAuth, loadAuth } from "../../lib/auth-store";
import { colors } from "../../components/ui";

export default function ProfileScreen() {
  const { auth } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!auth.token) return;
    getMe(auth.token)
      .then(data => {
        setName(data.name !== "None" ? data.name || "" : "");
        setPhone(data.phone || "");
        setRole(data.role || auth.role || "manager");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [auth.token]);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert("Required", "Please enter a valid name.");
      return;
    }
    setSaving(true);
    try {
      const currentAuth = loadAuth();
      await updateMe(auth.token!, name.trim());
      await saveAuth({
        ...currentAuth,
        userName: name.trim(),
      });
      Alert.alert("Success", "Profile updated successfully!");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F7F8" }}>
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
          <ArrowLeft size={24} color={colors.textMain} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: "800", color: colors.textMain }}>Account Profile</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <>
              {/* Info Card */}
              <View style={{
                backgroundColor: colors.card,
                borderRadius: 20,
                padding: 20,
                borderWidth: 1,
                borderColor: colors.border,
                gap: 16
              }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" }}>
                      <Phone size={20} color="#4F46E5" strokeWidth={2.2} />
                    </View>
                    <View>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: colors.textMuted }}>Phone Number</Text>
                      <Text style={{ fontSize: 16, fontWeight: "800", color: colors.textMain, marginTop: 2 }}>{phone || "N/A"}</Text>
                    </View>
                  </View>
                  <View style={{
                    backgroundColor: role.toLowerCase() === "owner" ? "#ECFDF5" : "#EFF6FF",
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 100,
                    borderWidth: 1,
                    borderColor: role.toLowerCase() === "owner" ? "#A7F3D0" : "#BFDBFE"
                  }}>
                    <Text style={{
                      fontSize: 12,
                      fontWeight: "800",
                      color: role.toLowerCase() === "owner" ? "#065F46" : "#1E40AF"
                    }}>
                      {role.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Edit Name */}
              <View style={{
                backgroundColor: colors.card,
                borderRadius: 20,
                padding: 20,
                borderWidth: 1,
                borderColor: colors.border,
                gap: 12
              }}>
                <Text style={{ fontSize: 15, fontWeight: "800", color: colors.textMain }}>Personal Details</Text>
                <Text style={{ fontSize: 13, color: colors.textMuted, lineHeight: 18, marginBottom: 4 }}>
                  Set your name so team members and activity history logs can identify your actions.
                </Text>

                <View style={{
                  backgroundColor: "#F9FAFC",
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderWidth: 1,
                  borderColor: "#D1D5DB",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12
                }}>
                  <User size={20} color={colors.textMuted} strokeWidth={2} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textMuted }}>Full Name</Text>
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      placeholder="Enter your name"
                      placeholderTextColor="#9CA3AF"
                      autoCapitalize="words"
                      style={{ fontSize: 16, fontWeight: "800", color: colors.textMain, padding: 0, marginTop: 2 }}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleSave}
                  disabled={saving}
                  style={{
                    backgroundColor: saving ? "#9CA3AF" : colors.primary,
                    borderRadius: 14,
                    paddingVertical: 15,
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
                    gap: 8,
                    marginTop: 12
                  }}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Save size={18} color="#fff" strokeWidth={2.5} />
                      <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>Save Profile</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
