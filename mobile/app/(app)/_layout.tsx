import { useEffect } from "react";
import { Tabs, router } from "expo-router";
import { Text, View, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "../../lib/auth-store";

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    home: "🏠",
    inventory: "📦",
    analytics: "📊",
    more: "•••",
  };
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.4 }}>
      {icons[name] || "•"}
    </Text>
  );
}

export default function AppLayout() {
  const insets = useSafeAreaInsets();
  const auth = useAuthStore();

  useEffect(() => {
    if (!auth.token) {
      router.replace("/onboarding/welcome");
    }
  }, [auth.token]);

  if (!auth.token) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F4F5F7" }}>
        <ActivityIndicator size="large" color="#1B4D36" />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#EAECEF",
          borderTopWidth: 1,
          paddingBottom: insets.bottom || 8,
          paddingTop: 8,
          height: 60 + (insets.bottom || 0),
        },
        tabBarActiveTintColor: "#1B4D36",
        tabBarInactiveTintColor: "#687076",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: "Inventory",
          tabBarIcon: ({ focused }) => <TabIcon name="inventory" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Analytics",
          tabBarIcon: ({ focused }) => <TabIcon name="analytics" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ focused }) => <TabIcon name="more" focused={focused} />,
        }}
      />
      <Tabs.Screen name="item-detail" options={{ href: null }} />
      <Tabs.Screen name="adjust-stock" options={{ href: null }} />
      <Tabs.Screen name="issue-stock" options={{ href: null }} />
      <Tabs.Screen name="receive-stock" options={{ href: null }} />
      <Tabs.Screen name="log-wastage" options={{ href: null }} />
      <Tabs.Screen name="invoice-history" options={{ href: null }} />
      <Tabs.Screen name="activity-history" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="scan-invoice" options={{ href: null }} />
    </Tabs>
  );
}
