import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const INVENTORY = [
  { id: "paneer", name: "Paneer", category: "Dairy", unit: "kg", quantity: 18, buffer: 12, img: "🧀", cost: 420 },
  { id: "chk-brst", name: "Chicken Breast", category: "Meat", unit: "kg", quantity: 4, buffer: 15, img: "🍗", cost: 280 },
  { id: "basmati", name: "Basmati Rice", category: "Dry Goods", unit: "kg", quantity: 42, buffer: 20, img: "🍚", cost: 90 },
  { id: "sun-oil", name: "Sunflower Oil", category: "Dry Goods", unit: "L", quantity: 12, buffer: 10, img: "🫙", cost: 140 },
  { id: "tomato", name: "Tomatoes", category: "Produce", unit: "kg", quantity: 3, buffer: 10, img: "🍅", cost: 50 },
  { id: "onion", name: "Onions", category: "Produce", unit: "kg", quantity: 22, buffer: 15, img: "🧅", cost: 40 },
  { id: "garlic", name: "Garlic", category: "Produce", unit: "kg", quantity: 2.5, buffer: 3, img: "🧄", cost: 120 },
  { id: "milk", name: "Full Cream Milk", category: "Dairy", unit: "L", quantity: 10, buffer: 8, img: "🥛", cost: 65 },
  { id: "butter", name: "Butter", category: "Dairy", unit: "kg", quantity: 5.5, buffer: 4, img: "🧈", cost: 550 },
  { id: "salt", name: "Salt", category: "Spices", unit: "kg", quantity: 12, buffer: 5, img: "🧂", cost: 25 },
  { id: "chilli", name: "Red Chilli Powder", category: "Spices", unit: "kg", quantity: 1.5, buffer: 2, img: "🌶️", cost: 350 },
  { id: "turmeric", name: "Turmeric Powder", category: "Spices", unit: "kg", quantity: 1.2, buffer: 2, img: "🌿", cost: 280 },
  { id: "coriander", name: "Coriander Leaves", category: "Produce", unit: "kg", quantity: 0.2, buffer: 1, img: "🌿", cost: 80 },
  { id: "lemon", name: "Lemons", category: "Produce", unit: "pcs", quantity: 15, buffer: 50, img: "🍋", cost: 5 },
  { id: "coke", name: "Coca-Cola 330ml", category: "Beverages", unit: "pcs", quantity: 12, buffer: 48, img: "🥤", cost: 35 },
  { id: "water", name: "Mineral Water 1L", category: "Beverages", unit: "pcs", quantity: 24, buffer: 24, img: "💧", cost: 20 },
  { id: "mutton", name: "Mutton (Curry Cut)", category: "Meat", unit: "kg", quantity: 0, buffer: 5, img: "🥩", cost: 850 },
  { id: "cashew", name: "Cashews", category: "Dry Goods", unit: "kg", quantity: 5, buffer: 4, img: "🥜", cost: 800 },
  { id: "sugar", name: "White Sugar", category: "Dry Goods", unit: "kg", quantity: 20, buffer: 10, img: "🍬", cost: 45 },
];

function getStatus(item: typeof INVENTORY[0]) {
  if (item.quantity === 0) return "Out of Stock";
  if (item.quantity <= item.buffer * 0.3) return "Critical";
  if (item.quantity <= item.buffer * 0.6) return "Low";
  return "Healthy";
}

function getHealthScore(items: typeof INVENTORY) {
  const healthy = items.filter(i => getStatus(i) === "Healthy").length;
  return Math.round((healthy / items.length) * 100);
}

function OwnerHome() {
  const score = getHealthScore(INVENTORY);
  const critical = INVENTORY.filter(i => ["Critical", "Out of Stock"].includes(getStatus(i)));
  const actionItems = critical.slice(0, 3);

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="px-5 pt-4 pb-6">

        {/* Header */}
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-[13px] text-kosh-textMuted font-medium">Good Morning,</Text>
            <Text className="text-[24px] font-bold text-kosh-textMain">Aditya 👋</Text>
          </View>
          <TouchableOpacity className="w-10 h-10 bg-white rounded-full items-center justify-center border border-kosh-border">
            <Text className="text-lg">🔔</Text>
          </TouchableOpacity>
        </View>

        {/* Health Score Card */}
        <View className="bg-kosh-primary rounded-3xl p-5 mb-4">
          <View className="flex-row justify-between items-center">
            <View className="flex-1">
              <Text className="text-white text-[13px] font-medium mb-1" style={{ opacity: 0.7 }}>Inventory Health</Text>
              <Text className="text-white text-[40px] font-bold" style={{ lineHeight: 44 }}>{score}</Text>
              <Text className="text-white text-[13px] mt-1" style={{ opacity: 0.7 }}>out of 100</Text>
            </View>
            <View className="w-20 h-20 rounded-full items-center justify-center" style={{ borderWidth: 4, borderColor: "rgba(255,255,255,0.2)" }}>
              <Text className="text-white text-[28px] font-bold">{score}</Text>
            </View>
          </View>
          <View className="mt-4 pt-4" style={{ borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.2)" }}>
            <Text className="text-white text-[12px] font-medium" style={{ opacity: 0.7 }}>
              {critical.length} item{critical.length !== 1 ? "s" : ""} need attention
            </Text>
          </View>
        </View>

        {/* Stats Row */}
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1 bg-white rounded-2xl p-4 border border-kosh-border">
            <Text className="text-kosh-textMuted text-[12px] font-medium mb-1">Today's Purchases</Text>
            <Text className="text-kosh-textMain text-[20px] font-bold">₹42,300</Text>
          </View>
          <View className="flex-1 bg-white rounded-2xl p-4 border border-kosh-border">
            <Text className="text-kosh-textMuted text-[12px] font-medium mb-1">Consumption</Text>
            <Text className="text-kosh-textMain text-[20px] font-bold">₹31,400</Text>
          </View>
        </View>

        <View className="bg-white rounded-2xl p-4 border border-kosh-border mb-4">
          <Text className="text-kosh-textMuted text-[12px] font-medium mb-1">Today's Wastage</Text>
          <Text className="text-kosh-textMain text-[20px] font-bold">₹2,100</Text>
        </View>

        {/* Action Items */}
        {actionItems.length > 0 && (
          <View className="bg-white rounded-2xl border border-kosh-border mb-4 overflow-hidden">
            <View className="px-4 pt-4 pb-2">
              <Text className="text-[15px] font-bold text-kosh-textMain">Needs Attention</Text>
            </View>
            {actionItems.map((item, idx) => (
              <TouchableOpacity
                key={item.id}
                className={`px-4 py-3 flex-row items-center gap-3 ${idx < actionItems.length - 1 ? "border-b border-kosh-border" : ""}`}
              >
                <View className="w-10 h-10 bg-red-50 rounded-xl items-center justify-center">
                  <Text className="text-xl">{item.img}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-[14px] font-semibold text-kosh-textMain">{item.name}</Text>
                  <Text className="text-[12px] text-kosh-textMuted">
                    {getStatus(item) === "Out of Stock" ? "Currently out of stock" : `Only ${item.quantity}${item.unit} remaining`}
                  </Text>
                </View>
                <Text className="text-kosh-textMuted">›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* AI Recommendations */}
        <View className="bg-kosh-primary rounded-2xl p-5">
          <Text className="text-white font-bold text-[15px] mb-3">AI Recommendations</Text>
          <View className="gap-2">
            <Text className="text-white text-[13px]" style={{ opacity: 0.8 }}>• Order 20kg paneer today</Text>
            <Text className="text-white text-[13px]" style={{ opacity: 0.8 }}>• Switch chicken supplier</Text>
            <Text className="text-white text-[13px]" style={{ opacity: 0.8 }}>• Butter usage 18% above normal</Text>
          </View>
          <TouchableOpacity className="mt-4 rounded-full py-2.5 items-center" style={{ borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" }}>
            <Text className="text-white font-semibold text-[13px]">View All Recommendations</Text>
          </TouchableOpacity>
        </View>

      </View>
    </ScrollView>
  );
}

function ManagerHome() {
  const tasks = [
    { icon: "📦", title: "Receive Deliveries", count: 2, color: "bg-blue-50" },
    { icon: "🛒", title: "Pending POs", count: 3, color: "bg-amber-50" },
    { icon: "⚠️", title: "Low Stock Items", count: 5, color: "bg-red-50" },
    { icon: "✏️", title: "Pending Corrections", count: 2, color: "bg-purple-50" },
  ];

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="px-5 pt-4 pb-6">

        {/* Header */}
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-[13px] text-kosh-textMuted font-medium">Good Morning,</Text>
            <Text className="text-[24px] font-bold text-kosh-textMain">Ramesh 👋</Text>
          </View>
          <TouchableOpacity className="w-10 h-10 bg-white rounded-full items-center justify-center border border-kosh-border">
            <Text className="text-lg">🔔</Text>
          </TouchableOpacity>
        </View>

        {/* Today's Tasks */}
        <Text className="text-[17px] font-bold text-kosh-textMain mb-3">Today's Tasks</Text>
        <View className="gap-3 mb-6">
          {tasks.map((task) => (
            <TouchableOpacity
              key={task.title}
              className="bg-white rounded-2xl p-4 flex-row items-center gap-4 border border-kosh-border"
            >
              <View className={`w-12 h-12 ${task.color} rounded-xl items-center justify-center`}>
                <Text className="text-2xl">{task.icon}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-kosh-textMain">{task.title}</Text>
                <Text className="text-[13px] text-kosh-textMuted">{task.count} pending</Text>
              </View>
              <View className="w-6 h-6 bg-kosh-primary rounded-full items-center justify-center">
                <Text className="text-white text-[11px] font-bold">{task.count}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats */}
        <View className="flex-row gap-3">
          <View className="flex-1 bg-white rounded-2xl p-4 border border-kosh-border">
            <Text className="text-kosh-textMuted text-[12px] font-medium mb-1">Today's Issues</Text>
            <Text className="text-kosh-textMain text-[20px] font-bold">6 entries</Text>
          </View>
          <View className="flex-1 bg-white rounded-2xl p-4 border border-kosh-border">
            <Text className="text-kosh-textMuted text-[12px] font-medium mb-1">Today's Wastage</Text>
            <Text className="text-kosh-textMain text-[20px] font-bold">3 entries</Text>
          </View>
        </View>

      </View>
    </ScrollView>
  );
}

export default function HomeScreen() {
  const [role, setRole] = useState<"owner" | "manager">("owner");

  return (
    <SafeAreaView className="flex-1 bg-kosh-bg">
      {/* Role Switcher */}
      <View className="flex-row items-center justify-center py-2 px-4">
        <View className="flex-row bg-white rounded-full p-1 border border-kosh-border gap-1">
          <TouchableOpacity
            onPress={() => setRole("owner")}
            className={`px-4 py-1.5 rounded-full ${role === "owner" ? "bg-kosh-textMain" : ""}`}
          >
            <Text className={`text-[11px] font-bold uppercase tracking-wider ${role === "owner" ? "text-white" : "text-kosh-textMuted"}`}>
              Owner View
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setRole("manager")}
            className={`px-4 py-1.5 rounded-full ${role === "manager" ? "bg-kosh-textMain" : ""}`}
          >
            <Text className={`text-[11px] font-bold uppercase tracking-wider ${role === "manager" ? "text-white" : "text-kosh-textMuted"}`}>
              Manager View
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {role === "owner" ? <OwnerHome /> : <ManagerHome />}
    </SafeAreaView>
  );
}
