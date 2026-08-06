import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft, MessageCircle, User, ChevronDown, Check } from "lucide-react-native";
import { colors } from "../../components/ui";
import { useAuth } from "../../lib/auth-context";
import { createStaffContact, inviteUser } from "../../lib/api";

type RoleId = "kitchen_staff" | "billing_staff" | "manager";

interface RoleDef {
  id: RoleId;
  title: string;
  tag: string;
  desc: string;
  action: string;
  Icon: any;
  type: "staff" | "user";
}

const ROLES: RoleDef[] = [
  { id: "kitchen_staff", title: "Kitchen Staff", tag: "Required", desc: "Send bills and KOTs", action: "Connect Staff", Icon: MessageCircle, type: "staff" },
  { id: "billing_staff", title: "Billing Person", tag: "Optional", desc: "Share customer bills", action: "Connect Billing", Icon: MessageCircle, type: "staff" },
  { id: "manager", title: "Manager", tag: "Optional", desc: "Approve and manage operations", action: "Invite Manager", Icon: User, type: "user" },
];

export default function ConnectTeamScreen() {
  const { auth } = useAuth();
  const [activeRole, setActiveRole] = useState<RoleId | null>(null);
  const [addedMembers, setAddedMembers] = useState<{ role: RoleId; name: string; phone: string }[]>([]);
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

  async function handleRegister() {
    if (!name.trim() || !phone.trim() || !auth.token || !activeRole) return;
    setSaving(true);
    const fullPhone = `${countryCode}${phone.trim()}`;
    try {
      if (activeRole === "manager") {
        await inviteUser(auth.token, fullPhone, name.trim(), "manager");
      } else {
        await createStaffContact(auth.token, fullPhone, name.trim(), activeRole);
      }
      setAddedMembers((prev) => [...prev, { role: activeRole, name: name.trim(), phone: fullPhone }]);
      setName("");
      setPhone("");
      setActiveRole(null);
      Alert.alert("Success", `${activeRole === "manager" ? "Manager invited" : "Staff member connected"} successfully!`);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to add team member");
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
            Connect your team{"\n"}on WhatsApp / Telegram
          </Text>
          <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: "600", textAlign: "center", marginBottom: 32 }}>
            SANQ works where your team works. Add staff and managers below.
          </Text>

          <View style={{ gap: 16 }}>
            {ROLES.map((role) => {
              const isOpen = activeRole === role.id;
              const roleMembers = addedMembers.filter((m) => m.role === role.id);

              return (
                <View key={role.id} style={{ backgroundColor: "white", borderRadius: 24, borderWidth: 1, borderColor: colors.border, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 20, elevation: 2 }}>
                  <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 16 }}>
                    <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: role.id === "manager" ? "#EFF6FF" : "#ECFDF5", borderWidth: 1, borderColor: role.id === "manager" ? "#DBEAFE" : "#D1FAE5", alignItems: "center", justifyContent: "center" }}>
                      <role.Icon size={22} color={role.id === "manager" ? "#2563EB" : "#059669"} strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <Text style={{ fontSize: 16, fontWeight: "800", color: colors.textMain }}>{role.title}</Text>
                        <View style={{ backgroundColor: "#F4F5F7", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100, borderWidth: 1, borderColor: colors.border }}>
                          <Text style={{ fontSize: 10, fontWeight: "800", color: colors.textMuted }}>{role.tag}</Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: "600", marginBottom: 16 }}>{role.desc}</Text>

                      {/* Display added members for this role */}
                      {roleMembers.length > 0 && (
                        <View style={{ gap: 8, marginBottom: 16 }}>
                          {roleMembers.map((m, mIdx) => (
                            <View key={mIdx} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#F9FAFB", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB" }}>
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                <Check size={14} color="#059669" strokeWidth={3} />
                                <Text style={{ fontSize: 13, fontWeight: "700", color: colors.textMain }}>{m.name}</Text>
                              </View>
                              <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textMuted }}>{m.phone}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {!isOpen && (
                        <TouchableOpacity
                          onPress={() => {
                            setActiveRole(role.id);
                            setName("");
                            setPhone("");
                          }}
                          style={{
                            paddingVertical: 12,
                            borderRadius: 100,
                            backgroundColor: roleMembers.length > 0 ? "#F4F5F7" : colors.primary,
                            borderWidth: roleMembers.length > 0 ? 1 : 0,
                            borderColor: colors.border,
                            alignItems: "center",
                          }}
                        >
                          <Text style={{ fontSize: 13, fontWeight: "800", color: roleMembers.length > 0 ? colors.textMain : "white" }}>
                            {roleMembers.length > 0 ? `+ Add Another ${role.title}` : role.action}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {isOpen && (
                    <View style={{ marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.border, gap: 12 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={{ fontSize: 14, fontWeight: "800", color: colors.textMain }}>
                          {role.id === "manager" ? "Invite Manager" : `Register ${role.title}`}
                        </Text>
                      </View>
                      <TextInput
                        placeholder={role.id === "manager" ? "Manager Name" : "Staff Name"}
                        value={name}
                        onChangeText={setName}
                        style={{ backgroundColor: "#F7F7F8", borderRadius: 12, padding: 14, fontSize: 15, fontWeight: "700", color: colors.textMain }}
                      />
                      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                        <TouchableOpacity
                          onPress={() => setPickerOpen(true)}
                          style={{
                            backgroundColor: "#F7F7F8",
                            borderRadius: 12,
                            paddingHorizontal: 16,
                            paddingVertical: 14,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
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
                        <TouchableOpacity
                          onPress={() => setActiveRole(null)}
                          style={{ flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: "center" }}
                        >
                          <Text style={{ fontWeight: "700", color: colors.textMuted }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={handleRegister}
                          disabled={saving || !name.trim() || !phone.trim()}
                          style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", opacity: saving || !name.trim() || !phone.trim() ? 0.7 : 1 }}
                        >
                          {saving ? <ActivityIndicator color="white" size="small" /> : <Text style={{ fontWeight: "800", color: "white" }}>{role.id === "manager" ? "Invite" : "Register"}</Text>}
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
                onPress={() => {
                  setCountryCode(item.code);
                  setPickerOpen(false);
                }}
                style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}
              >
                <Text style={{ fontSize: 16, color: colors.textMain, fontWeight: "600" }}>
                  {item.label} ({item.code})
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setPickerOpen(false)} style={{ marginTop: 16, alignItems: "center", paddingVertical: 12 }}>
              <Text style={{ fontSize: 16, color: colors.textMuted, fontWeight: "800" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
