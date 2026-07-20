import { useEffect } from "react";
import { Tabs, router } from "expo-router";
import { View, Text, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "../../lib/auth-store";
import { Home, Package, BarChart2, Menu } from "lucide-react-native";

const PRIMARY = "#1B4D36";
const MUTED = "#687076";
const BORDER = "#EAECEF";

function TabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const tabs = [
    { name: "home", label: "Home", Icon: Home },
    { name: "inventory", label: "Inventory", Icon: Package },
    { name: "analytics", label: "Insights", Icon: BarChart2 },
    { name: "more", label: "More", Icon: Menu },
  ];

  const visibleTabs = state.routes.filter((r: any) => tabs.find(t => t.name === r.name));

  return (
    <View style={{
      flexDirection: "row",
      backgroundColor: "white",
      borderTopWidth: 1,
      borderTopColor: BORDER,
      paddingBottom: insets.bottom || 8,
      paddingTop: 10,
      paddingHorizontal: 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -10 },
      shadowOpacity: 0.04,
      shadowRadius: 40,
      elevation: 10,
    }}>
      {visibleTabs.map((route: any) => {
        const tabDef = tabs.find(t => t.name === route.name);
        if (!tabDef) return null;
        const isFocused = state.routes[state.index]?.name === route.name;
        const { Icon: TabIcon, label } = tabDef;

        return (
          <TouchableOpacity
            key={route.name}
            onPress={() => navigation.navigate(route.name)}
            activeOpacity={0.7}
            style={{ flex: 1, alignItems: "center", gap: 4 }}
          >
            <View style={{
              width: 48,
              height: 32,
              borderRadius: 16,
              backgroundColor: isFocused ? "#E8F0EC" : "transparent",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <TabIcon size={22} color={isFocused ? PRIMARY : MUTED} strokeWidth={isFocused ? 2.5 : 2} />
            </View>
            <Text style={{
              fontSize: 11,
              fontWeight: isFocused ? "800" : "600",
              color: isFocused ? PRIMARY : MUTED,
              letterSpacing: 0.2,
            }}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function AppLayout() {
  const auth = useAuthStore();

  useEffect(() => {
    if (!auth.token) {
      router.replace("/onboarding/welcome");
    }
  }, [auth.token]);

  if (!auth.token) return null;

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="inventory" />
      <Tabs.Screen name="analytics" />
      <Tabs.Screen name="more" />
      <Tabs.Screen name="item-detail" options={{ href: null }} />
      <Tabs.Screen name="adjust-stock" options={{ href: null }} />
      <Tabs.Screen name="issue-stock" options={{ href: null }} />
      <Tabs.Screen name="receive-stock" options={{ href: null }} />
      <Tabs.Screen name="log-wastage" options={{ href: null }} />
      <Tabs.Screen name="invoice-history" options={{ href: null }} />
      <Tabs.Screen name="activity-history" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="scan-invoice" options={{ href: null }} />
      <Tabs.Screen name="recipes" options={{ href: null }} />
    </Tabs>
  );
}
