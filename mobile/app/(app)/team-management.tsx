import { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, ChevronDown } from "lucide-react-native";
import { useAuth } from "../../lib/auth-context";
import { listUsers, inviteUser, listStaffContacts, createStaffContact } from "../../lib/api";
import { colors } from "../../components/ui";

export default function TeamManagementScreen() {
  const { auth } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [role, setRole] = useState<"kitchen_staff" | "manager" | "owner">("kitchen_staff");
  const [inviting, setInviting] = useState(false);

  const COUNTRY_CODES = [
    { code: "+91", label: "India" },
    { code: "+1", label: "US/Canada" },
    { code: "+44", label: "UK" },
    { code: "+971", label: "UAE" },
  ];

  async function loadTeam() {
    console.log("[TeamManagement] auth.token at loadTeam:", auth.token ? `${auth.token.substring(0, 20)}...` : "MISSING/FALSY");
    if (!auth.token) return;
    setLoading(true);
    try {
      const [userData, staffData] = await Promise.all([
        listUsers(auth.token).catch(() => []),
        listStaffContacts(auth.token).catch(() => []),
      ]);
      const mappedStaff = staffData.map((s: any) => ({
        id: s.id || s.phone,
        name: s.name,
        phone: s.phone,
        role: "Kitchen Staff",
      }));
      setUsers([...userData, ...mappedStaff]);
    } catch (e: any) {
      console.error("[TeamManagement] loadTeam failed:", e.message);
      Alert.alert("Error", e.message || "Failed to load team");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTeam();
  }, [auth.token]);

  async function handleInvite() {
    if (!name || !phone || !auth.token) return;
    setInviting(true);
    try {
      const fullPhone = `${countryCode}${phone}`;
      if (role === "kitchen_staff") {
        await createStaffContact(auth.token, fullPhone, name, "kitchen_staff");
        Alert.alert("Success", "Staff member connected");
      } else {
        await inviteUser(auth.token, fullPhone, name, role);
        Alert.alert("Success", "User added to restaurant");
      }
      setName("");
      setPhone("");
      loadTeam();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to add member");
    } finally {
      setInviting(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F7F8" }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}>
          <ChevronLeft size={24} color={colors.textMain} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: "800", color: colors.textMain, marginLeft: 12 }}>Team Management</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40, gap: 32 }}>
        {/* Team List */}
        <View>
          <Text style={{ fontSize: 17, fontWeight: "800", color: colors.textMain, marginBottom: 12 }}>Current Team</Text>
          {loading ? (
            <ActivityIndicator />
          ) : (
            <View style={{ backgroundColor: "white", borderRadius: 24, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 12 }}>
              {users.map(u => (
                <View key={u.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 12 }}>
                  <View>
                    <Text style={{ fontSize: 15, fontWeight: "800", color: colors.textMain }}>{u.name || "Unknown"}</Text>
                    <Text style={{ fontSize: 13, color: colors.textMuted }}>{u.phone}</Text>
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primary, textTransform: "capitalize" }}>{u.role ? u.role.replace("_", " ") : ""}</Text>
                </View>
              ))}
              {users.length === 0 && <Text style={{ color: colors.textMuted }}>No team members found.</Text>}
            </View>
          )}
        </View>

        {/* Invite Form */}
        <View>
          <Text style={{ fontSize: 17, fontWeight: "800", color: colors.textMain, marginBottom: 12 }}>Add Team Member</Text>
          <View style={{ backgroundColor: "white", borderRadius: 24, borderWidth: 1, borderColor: colors.border, padding: 20, gap: 16 }}>
            {role !== "kitchen_staff" && (
              <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: -4 }}>
                Adds an existing Kosh user to this restaurant. They must have already signed up with this phone number.
              </Text>
            )}
            <TextInput
              placeholder="Name"
              value={name}
              onChangeText={setName}
              style={{ backgroundColor: "#F7F7F8", borderRadius: 12, padding: 16, fontSize: 15, fontWeight: "700", color: colors.textMain }}
            />
            <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
              <TouchableOpacity onPress={() => setPickerOpen(true)} style={{
                backgroundColor: "#F7F7F8",
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 16,
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
                  style={{ backgroundColor: "#F7F7F8", borderRadius: 12, padding: 16, fontSize: 15, fontWeight: "700", color: colors.textMain }}
                />
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity onPress={() => setRole("kitchen_staff")} style={{ flex: 1.2, paddingVertical: 12, paddingHorizontal: 4, borderRadius: 12, borderWidth: 1, borderColor: role === "kitchen_staff" ? colors.primary : colors.border, backgroundColor: role === "kitchen_staff" ? "#E8F0EC" : "white", alignItems: "center" }}>
                <Text style={{ fontWeight: "700", fontSize: 13, color: role === "kitchen_staff" ? colors.primary : colors.textMuted }}>Kitchen Staff</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setRole("manager")} style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 4, borderRadius: 12, borderWidth: 1, borderColor: role === "manager" ? colors.primary : colors.border, backgroundColor: role === "manager" ? "#E8F0EC" : "white", alignItems: "center" }}>
                <Text style={{ fontWeight: "700", fontSize: 13, color: role === "manager" ? colors.primary : colors.textMuted }}>Manager</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setRole("owner")} style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 4, borderRadius: 12, borderWidth: 1, borderColor: role === "owner" ? colors.primary : colors.border, backgroundColor: role === "owner" ? "#E8F0EC" : "white", alignItems: "center" }}>
                <Text style={{ fontWeight: "700", fontSize: 13, color: role === "owner" ? colors.primary : colors.textMuted }}>Owner</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={handleInvite} disabled={inviting || !name || !phone} style={{ backgroundColor: colors.primary, borderRadius: 16, padding: 16, alignItems: "center", marginTop: 8, opacity: inviting || !name || !phone ? 0.7 : 1 }}>
              <Text style={{ color: "white", fontSize: 15, fontWeight: "800" }}>{inviting ? "Saving..." : (role === "kitchen_staff" ? "Connect Staff" : "Add to Restaurant")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

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
