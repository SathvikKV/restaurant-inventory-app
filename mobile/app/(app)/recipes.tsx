import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft, ChevronRight, Plus, Sparkles } from "lucide-react-native";
import { colors } from "../../components/ui";

const MOCK_RECIPES = [
  { id: "1", name: "Butter Chicken", ingredients: 5 },
  { id: "2", name: "Paneer Tikka", ingredients: 3 },
  { id: "3", name: "Garlic Naan", ingredients: 3 },
];

export default function RecipesScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F7F8" }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>
        <TouchableOpacity onPress={() => router.navigate("/(app)/more" as any)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}>
          <ChevronLeft size={24} color={colors.textMain} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        <Text style={{ fontSize: 36, fontWeight: "800", color: colors.textMain, letterSpacing: -1, marginBottom: 8 }}>Recipes</Text>

        {/* Description */}
        <View style={{ backgroundColor: "#E8F0EC", borderRadius: 20, padding: 16, flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 24 }}>
          <Sparkles size={18} color={colors.primary} strokeWidth={2} />
          <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: colors.primary, lineHeight: 20 }}>
            SANQ maps your menu items to inventory usage. Review and refine the approximate ingredients below.
          </Text>
        </View>

        {/* Recipe list */}
        <View style={{ backgroundColor: colors.card, borderRadius: 28, borderWidth: 1, borderColor: colors.border, overflow: "hidden", marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 20, elevation: 2 }}>
          {MOCK_RECIPES.map((recipe, idx) => (
            <TouchableOpacity
              key={recipe.id}
              activeOpacity={0.7}
              style={{ padding: 20, borderBottomWidth: idx < MOCK_RECIPES.length - 1 ? 1 : 0, borderBottomColor: colors.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
            >
              <View>
                <Text style={{ fontSize: 16, fontWeight: "800", color: colors.textMain, letterSpacing: -0.2, marginBottom: 4 }}>{recipe.name}</Text>
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textMuted }}>{recipe.ingredients} ingredients mapped</Text>
              </View>
              <ChevronRight size={20} color={colors.textMuted} strokeWidth={2} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Add recipes button */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={{ borderWidth: 2, borderStyle: "dashed", borderColor: colors.primary, borderRadius: 24, paddingVertical: 20, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}
        >
          <Plus size={20} color={colors.primary} strokeWidth={2.5} />
          <Text style={{ fontSize: 15, fontWeight: "800", color: colors.primary }}>Add Recipes</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
