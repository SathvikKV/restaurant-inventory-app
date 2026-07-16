import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

// TODO: Replace mock user data with:
// GET /api/v1/auth/me -> user profile
// POST /api/v1/auth/logout -> clear token and redirect to onboarding

const MENU_SECTIONS = [
  {
    title: "Operations",
    items: [
      { icon: "📷", label: "Scan Invoice", route: "/(app)/scan-invoice" },
      { icon: "📋", label: "Invoice History", route: "/(app)/invoice-history" },
      { icon: "📊", label: "Activity Log", route: "/(app)/activity-history" },
      { icon: "🔔", label: "Notifications", route: "/(app)/notifications" },
    ],
  },
  {
    title: "Management",
    items: [
      { icon: "🏪", label: "Restaurants", route: null },
      { icon: "👥", label: "Users & Roles", route: null },
      { icon: "⚙️", label: "Settings", route: null },
    ],
  },
  {
    title: "Support",
    items: [
      { icon: "❓", label: "Help & Support", route: null },
      { icon: "📖", label: "About Mise", route: null },
    ],
  },
];

export default function MoreScreen() {
  return (
    <SafeAreaView className="flex-1 bg-kosh-bg">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="px-5 pt-4 pb-8">

          {/* Profile Card */}
          <View className="bg-white rounded-2xl p-4 border border-kosh-border mb-6 flex-row items-center gap-4">
            <View className="w-14 h-14 bg-kosh-primary rounded-full items-center justify-center">
              <Text className="text-white text-[22px] font-bold">A</Text>
            </View>
            <View className="flex-1">
              <Text className="text-[17px] font-bold text-kosh-textMain">Aditya Sharma</Text>
              <Text className="text-[13px] text-kosh-textMuted">Owner · Minerva Coffee Shop</Text>
            </View>
            <TouchableOpacity className="w-8 h-8 items-center justify-center">
              <Text className="text-kosh-textMuted text-[18px]">›</Text>
            </TouchableOpacity>
          </View>

          {/* Menu Sections */}
          {MENU_SECTIONS.map(section => (
            <View key={section.title} className="mb-5">
              <Text className="text-[12px] font-bold text-kosh-textMuted uppercase tracking-wide mb-2 ml-1">
                {section.title}
              </Text>
              <View className="bg-white rounded-2xl border border-kosh-border overflow-hidden">
                {section.items.map((item, idx) => (
                  <TouchableOpacity
                    key={item.label}
                    onPress={() => item.route && router.push(item.route as any)}
                    className={`px-4 py-4 flex-row items-center gap-3 ${idx < section.items.length - 1 ? "border-b border-kosh-border" : ""}`}
                  >
                    <Text className="text-xl">{item.icon}</Text>
                    <Text className="flex-1 text-[15px] font-medium text-kosh-textMain">{item.label}</Text>
                    <Text className="text-kosh-textMuted text-[18px]">›</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          {/* Logout */}
          <TouchableOpacity
            onPress={() => router.replace("/onboarding/welcome")}
            className="bg-white rounded-2xl p-4 border flex-row items-center gap-3"
            style={{ borderColor: "#FEE2E2" }}
          >
            <Text className="text-xl">🚪</Text>
            <Text className="flex-1 text-[15px] font-medium" style={{ color: "#EF4444" }}>Log Out</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
