import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChefHat, Users, FileText, Receipt, Store, ChevronRight, LogOut, User } from "lucide-react-native";
import { useAuth } from "../../../lib/auth-context";
import { clearAuth, saveAuth } from "../../../lib/auth-store";
import { getMe } from "../../../lib/api";
import { MiseLogo, colors } from "../../../components/ui";
import { resetStackAndNavigate } from "../../../lib/nav";

const MENU_ITEMS: { icon: any; label: string; bg: string; color: string; badge?: string | null; route?: string }[] = [
  { icon: User, label: "Account & Profile", bg: "#EEF2FF", color: "#4F46E5", route: "/(app)/profile" },
  { icon: ChefHat, label: "Recipes", bg: "#FFF7ED", color: "#EA580C", route: "/(app)/recipes" },
  { icon: Users, label: "Team Management", bg: "#EFF6FF", color: "#2563EB", badge: null, route: "/(app)/team-management" },
  { icon: FileText, label: "Activity History", bg: "#ECFDF5", color: "#059669", route: "/(app)/activity-history" },
  { icon: Receipt, label: "Invoices & KOTs", bg: "#F5F3FF", color: "#7C3AED", route: "/(app)/invoice-history" },
  { icon: Store, label: "Workspace Settings", bg: "#F4F5F7", color: "#687076", route: "/(app)/workspace-settings" },
  { icon: Store, label: "Switch Restaurant", bg: "#FEF3C7", color: "#D97706", route: "/(app)/switch-restaurant" },
];


export default function MoreScreen() {
  const { auth } = useAuth();
  const [profile, setProfile] = useState<{ name: string; phone: string; role: string } | null>(null);

  const isActualOwner = (profile?.role || auth.role || "").toLowerCase() === "owner";
  const actualRole = isActualOwner ? "owner" : (auth.role || "manager").toLowerCase();
  const effectiveRole = isActualOwner && auth.viewMode === "manager" ? "manager" : actualRole;

  const filteredMenuItems = MENU_ITEMS.filter(item => {
    if (effectiveRole !== "owner" && (item.label === "Team Management" || item.label === "Workspace Settings")) {
      return false;
    }
    return true;
  });

  useEffect(() => {
    if (!auth.token) return;
    (async () => {
      try {
        const me = await getMe(auth.token!);
        setProfile({ name: me.name, phone: me.phone, role: me.role });
        if (me.role && me.role.toLowerCase() !== (auth.role || "").toLowerCase()) {
          saveAuth({ ...auth, role: me.role.toLowerCase() });
        }
      } catch {}
    })();
  }, [auth.token, auth.role]);

  function handleLogout() {
    clearAuth();
    resetStackAndNavigate("/onboarding/welcome");
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F7F8" }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40, gap: 32 }}>

        {/* Header */}
        <View>
          <MiseLogo size="small" />
          <Text style={{ fontSize: 36, fontWeight: "800", color: colors.textMain, letterSpacing: -1, marginTop: 16 }}>Settings</Text>
        </View>

        {/* Owner View Toggle Card */}
        {isActualOwner && (
          <View style={{
            backgroundColor: colors.card,
            borderRadius: 24,
            padding: 20,
            borderWidth: 1,
            borderColor: colors.border,
            gap: 14,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.03,
            shadowRadius: 20,
            elevation: 2,
          }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View>
                <Text style={{ fontSize: 16, fontWeight: "800", color: colors.textMain }}>Role View Mode</Text>
                <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textMuted, marginTop: 2 }}>
                  {effectiveRole === "owner" ? "Full administrative access" : "Previewing Manager-restricted view"}
                </Text>
              </View>
              <View style={{ backgroundColor: "#ECFDF5", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, borderWidth: 1, borderColor: "#A7F3D0" }}>
                <Text style={{ fontSize: 11, fontWeight: "800", color: "#065F46" }}>OWNER</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", backgroundColor: "#F3F4F6", borderRadius: 16, padding: 4 }}>
              <TouchableOpacity
                onPress={() => saveAuth({ ...auth, viewMode: "owner" })}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: effectiveRole === "owner" ? colors.textMain : "transparent",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "800", color: effectiveRole === "owner" ? "white" : colors.textMuted }}>Owner View</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => saveAuth({ ...auth, viewMode: "manager" })}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: effectiveRole === "manager" ? colors.textMain : "transparent",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "800", color: effectiveRole === "manager" ? "white" : colors.textMuted }}>Manager View</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Menu */}
        <View style={{
          backgroundColor: colors.card,
          borderRadius: 28,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: "hidden",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.03,
          shadowRadius: 20,
          elevation: 2,
        }}>
          {filteredMenuItems.map((item, idx) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => {
                if (item.label === "Team Management") {
                  console.log("[More] auth.token before navigating to Team Management:", auth.token ? "present" : "MISSING");
                }
                item.route && router.push(item.route as any);
              }}
              activeOpacity={0.7}
              style={{
                paddingHorizontal: 24,
                paddingVertical: 20,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottomWidth: idx < filteredMenuItems.length - 1 ? 1 : 0,
                borderBottomColor: colors.border,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: item.bg, alignItems: "center", justifyContent: "center" }}>
                  <item.icon size={18} color={item.color} strokeWidth={2} />
                </View>
                <Text style={{ fontSize: 16, fontWeight: "800", color: colors.textMain }}>{item.label}</Text>
              </View>
              {item.badge ? (
                <View style={{ backgroundColor: "#F4F5F7", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, borderWidth: 1, borderColor: colors.border }}>
                  <Text style={{ fontSize: 12, fontWeight: "800", color: colors.textMuted }}>{item.badge}</Text>
                </View>
              ) : (
                <ChevronRight size={20} color={colors.textMuted} strokeWidth={2} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign out */}
        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.8}
          style={{
            backgroundColor: colors.card,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: "#FECACA",
            paddingVertical: 20,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.03,
            shadowRadius: 20,
            elevation: 2,
          }}
        >
          <LogOut size={20} color="#EF4444" strokeWidth={2} />
          <Text style={{ fontSize: 16, fontWeight: "800", color: "#EF4444" }}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
