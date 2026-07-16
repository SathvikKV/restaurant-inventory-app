import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

// TODO: Wire push notifications via Expo Push Notification Service
// POST /api/v1/users/{id} with push_token when user logs in
// Notifications triggered by backend when:
//   - Stock drops below reorder threshold
//   - KOT item hard blocked
//   - Zone-2 confirmation pending > 30 minutes

const NOTIFICATIONS = [
  { id: 1, type: "critical", icon: "🔴", title: "Mutton out of stock", body: "Mutton (Curry Cut) is completely out of stock. Reorder immediately.", time: "5 min ago", unread: true },
  { id: 2, type: "warning", icon: "🟡", title: "Low stock alert", body: "Chicken Breast is below reorder threshold (4kg remaining, reorder at 15kg).", time: "1 hr ago", unread: true },
  { id: 3, type: "info", icon: "🔵", title: "Invoice needs review", body: "Invoice INV-1244 from Fresh Dairy Co. has items that need confirmation.", time: "2 hrs ago", unread: true },
  { id: 4, type: "success", icon: "🟢", title: "Invoice recorded", body: "Invoice INV-1245 from KY Vegetables was successfully processed. 8 items updated.", time: "3 hrs ago", unread: false },
  { id: 5, type: "warning", icon: "🟡", title: "Low stock alert", body: "Tomatoes is below reorder threshold (3kg remaining, reorder at 10kg).", time: "Yesterday", unread: false },
  { id: 6, type: "success", icon: "🟢", title: "Delivery confirmed", body: "Purchase order from United Meats has been received and inventory updated.", time: "Yesterday", unread: false },
];

export default function NotificationsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-kosh-bg">
      <View className="px-5 pt-4 pb-2">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 -ml-2 rounded-full items-center justify-center mb-4"
        >
          <Text className="text-[28px] text-kosh-textMain">‹</Text>
        </TouchableOpacity>
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-[24px] font-bold text-kosh-textMain">Notifications</Text>
          <TouchableOpacity>
            <Text className="text-[13px] font-semibold text-kosh-primary">Mark all read</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        <View className="bg-white rounded-2xl border border-kosh-border overflow-hidden mb-8">
          {NOTIFICATIONS.map((notif, idx) => (
            <TouchableOpacity
              key={notif.id}
              className={`px-4 py-4 flex-row items-start gap-3 ${idx < NOTIFICATIONS.length - 1 ? "border-b border-kosh-border" : ""}`}
              style={{ backgroundColor: notif.unread ? "#E8F0EC" : "white" }}
            >
              <Text className="text-xl" style={{ marginTop: 2 }}>{notif.icon}</Text>
              <View className="flex-1">
                <View className="flex-row justify-between items-start">
                  <Text className="text-[14px] font-bold text-kosh-textMain flex-1" style={{ paddingRight: 8 }}>{notif.title}</Text>
                  <Text className="text-[11px] text-kosh-textMuted">{notif.time}</Text>
                </View>
                <Text className="text-[13px] text-kosh-textMuted mt-1">{notif.body}</Text>
              </View>
              {notif.unread && (
                <View className="w-2 h-2 rounded-full bg-kosh-primary" style={{ marginTop: 6 }} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
