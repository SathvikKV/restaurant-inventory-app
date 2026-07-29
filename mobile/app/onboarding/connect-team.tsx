import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft, MessageCircle, User, ChevronDown } from "lucide-react-native";
import { colors } from "../../components/ui";
import { useAuth } from "../../lib/auth-context";
import { createStaffContact } from "../../lib/api";

const ROLES = [
  { title: "Kitchen Staff", tag: "Required", desc: "Send bills and indents", action: "Connect WhatsApp", primary: true, Icon: MessageCircle },
  { title: "Billing Person", tag: "Required", desc: "Share customer bills", action: "Connect WhatsApp", primary: true, Icon: MessageCircle },
  { title: "Manager", tag: "Optional", desc: "Approve and manage", action: "Invite on WhatsApp", primary: false, Icon: User },
];

export default function ConnectTeamScreen() {
  const { auth } = useAuth();
  const [kitchenFormOpen, setKitchenFormOpen] = useState(false);
  const [kitchenRegistered, setKitchenRegistered] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const COUNTRY_CODES = [
    { code: "+91", label: "India" },
    { code: "+1", label: "US/Canada" },
    { code: "+44", label: "UK" },
    { code: "+971", label: "UAE" },
  ];

  async function handleRegisterKitchen() {
    if (!name || !phone || !auth.token) return;
    setSaving(true);
    try {
      await createStaffContact(auth.token, `${countryCode}${phone}`, name, "kitchen_staff");
      setKitchenRegistered(true);
      setKitchenFormOpen(false);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to register staff");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F7F8" }}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 48 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 24, marginLeft: -12 }}
        >
          <ChevronLeft size={24} color={colors.textMain} strokeWidth={2} />
        </TouchableOpacity>

        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          <Text style={{ fontSize: 28, fontWeight: "800", color: colors.textMain, textAlign: "center", letterSpacing: -0.5, lineHeight: 36, marginBottom: 8 }}>
            Connect your team{"\n"}on WhatsApp
          </Text>
          <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: "600", textAlign: "center", marginBottom: 32 }}>
            SANQ works where your team works.
          </Text>

          <View style={{ gap: 12 }}>
            {ROLES.map((role, idx) => {
              const isKitchen = role.title === "Kitchen Staff";
              const showForm = isKitchen && kitchenFormOpen;
              const registered = isKitchen && kitchenRegistered;

              return (
              <View key={idx} style={{ backgroundColor: "white", borderRadius: 24, borderWidth: 1, borderColor: colors.border, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 20, elevation: 2 }}>
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 16 }}>
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "#ECFDF5", borderWidth: 1, borderColor: "#D1FAE5", alignItems: "center", justifyContent: "center" }}>
                    <role.Icon size={22} color="#059669" strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <Text style={{ fontSize: 15, fontWeight: "800", color: colors.textMain }}>{role.title}</Text>
                      <View style={{ backgroundColor: "#F4F5F7", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100, borderWidth: 1, borderColor: colors.border }}>
                        <Text style={{ fontSize: 10, fontWeight: "800", color: colors.textMuted }}>{role.tag}</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: "600", marginBottom: 16 }}>{role.desc}</Text>
                    
                    {registered ? (
                      <View style={{ paddingVertical: 10, borderRadius: 100, backgroundColor: "#F4F5F7", borderWidth: 0, alignItems: "center", opacity: 0.8 }}>
                        <Text style={{ fontSize: 13, fontWeight: "800", color: colors.textMuted }}>Registered ✓</Text>
                      </View>
                    ) : (
                      !showForm && (
                        <TouchableOpacity
                          disabled={!isKitchen && role.primary}
                          onPress={() => isKitchen ? setKitchenFormOpen(true) : null}
                          style={{
                            paddingVertical: 10,
                            borderRadius: 100,
                            backgroundColor: role.primary && !isKitchen ? colors.card : "white",
                            borderWidth: role.primary && !isKitchen ? 0 : 1.5,
                            borderColor: colors.primary,
                            alignItems: "center",
                            opacity: role.primary && !isKitchen ? 0.6 : 1,
                          }}>
                          <Text style={{ fontSize: 13, fontWeight: "800", color: role.primary && !isKitchen ? colors.textMuted : colors.primary }}>
                            {role.primary && !isKitchen ? "Coming soon" : role.action}
                          </Text>
                        </TouchableOpacity>
                      )
                    )}
                  </View>
                </View>

                {showForm && (
                  <View style={{ marginTop: 24, gap: 12 }}>
                    <Text style={{ fontSize: 14, fontWeight: "800", color: colors.textMain }}>Register Kitchen Staff</Text>
                    <TextInput
                      placeholder="Staff Name"
                      value={name}
                      onChangeText={setName}
                      style={{ backgroundColor: "#F7F7F8", borderRadius: 12, padding: 14, fontSize: 15, fontWeight: "700", color: colors.textMain }}
                    />
                    <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                      <TouchableOpacity onPress={() => setPickerOpen(true)} style={{
                        backgroundColor: "#F7F7F8",
                        borderRadius: 12,
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}>
                        <Text style={{ fontSize: 15, fontWeight: "700", color: colors.textMain }}>{countryCode}</Text>
                        <ChevronDown size={16} color={colors.textMuted} strokeWidth={2} />
                      </TouchableOpacity>

                      <View style={{ flex: 1 }}>
                        <TextInput
                          placeholder="Phone Number"
                          value={phone}
                          onChangeText={setPhone}
                          keyboardType="phone-pad"
                          style={{ backgroundColor: "#F7F7F8", borderRadius: 12, padding: 14, fontSize: 15, fontWeight: "700", color: colors.textMain }}
                        />
                      </View>
                    </View>
                    <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
                      <TouchableOpacity onPress={() => setKitchenFormOpen(false)} style={{ flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: "center" }}>
                        <Text style={{ fontWeight: "700", color: colors.textMuted }}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleRegisterKitchen} disabled={saving || !name || !phone} style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", opacity: saving || !name || !phone ? 0.7 : 1 }}>
                        {saving ? <ActivityIndicator color="white" size="small" /> : <Text style={{ fontWeight: "800", color: "white" }}>Register</Text>}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
              );
            })}
          </View>
        </ScrollView>

        <TouchableOpacity
          onPress={() => router.push("/onboarding/upload-menu")}
          activeOpacity={0.85}
          style={{ backgroundColor: colors.primary, borderRadius: 24, paddingVertical: 18, alignItems: "center", marginTop: 24, shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 4 }}
        >
          <Text style={{ color: "white", fontSize: 17, fontWeight: "800", letterSpacing: -0.3 }}>Continue</Text>
        </TouchableOpacity>
      </View>

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
