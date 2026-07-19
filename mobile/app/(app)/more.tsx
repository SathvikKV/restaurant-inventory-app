import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChefHat, Users, FileText, Receipt, Store, ChevronRight, LogOut } from "lucide-react-native";
import { useAuth } from "../../lib/auth-context";
import { clearAuth } from "../../lib/auth-store";
import { getMe } from "../../lib/api";
import { MiseLogo, colors } from "../../components/ui";

const MENU_ITEMS = [
  { icon: ChefHat, label: "Recipes", bg: "#FFF7ED", color: "#EA580C", route: null },
  { icon: Users, label: "Team Management", bg: "#EFF6FF", color: "#2563EB", badge: "4 Profiles", route: null },
  { icon: FileText, label: "Activity History", bg: "#ECFDF5", color: "#059669", route: "/(app)/activity-history" },
  { icon: Receipt, label: "Invoice History", bg: "#F5F3FF", color: "#7C3AED", route: "/(app)/invoice-history" },
  { icon: Store, label: "Workspace Settings", bg: "#F4F5F7", color: "#687076", route: null },
];

export default function MoreScreen() {
  const { auth } = useAuth();
  const [profile, setProfile] = useState<{ name: string; phone: string; role: string } | null>(null);

  useEffect(() => {
    if (!auth.token) return;
    (async () => {
      try {
        const me = await getMe(auth.token!);
        setProfile({ name: me.name, phone: me.phone, role: me.role });
      } catch {}
    })();
  }, [auth.token]);

  function handleLogout() {
    clearAuth();
    router.replace("/onboarding/welcome");
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F7F8" }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40, gap: 32 }}>

        {/* Header */}
        <View>
          <MiseLogo size="small" />
          <Text style={{ fontSize: 36, fontWeight: "800", color: colors.textMain, letterSpacing: -1, marginTop: 16 }}>Settings</Text>
        </View>

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
          {MENU_ITEMS.map((item, idx) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => item.route && router.push(item.route as any)}
              activeOpacity={0.7}
              style={{
                paddingHorizontal: 24,
                paddingVertical: 20,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottomWidth: idx < MENU_ITEMS.length - 1 ? 1 : 0,
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
