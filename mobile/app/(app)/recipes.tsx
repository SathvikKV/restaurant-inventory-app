import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { ChevronLeft, ChevronRight, Plus, Sparkles, UtensilsCrossed } from "lucide-react-native";
import { colors } from "../../components/ui";
import { useAuth } from "../../lib/auth-context";
import { listRecipes } from "../../lib/api";

type RecipeListItem = {
  id: string;
  name: string;
  ingredient_count: number;
};

export default function RecipesScreen() {
  const { auth } = useAuth();
  const [recipes, setRecipes] = useState<RecipeListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRecipes = useCallback(async () => {
    if (!auth.token) return;
    try {
      setLoading(true);
      const data = await listRecipes(auth.token);
      setRecipes(data || []);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to load recipes");
    } finally {
      setLoading(false);
    }
  }, [auth.token]);

  useFocusEffect(
    useCallback(() => {
      loadRecipes();
    }, [loadRecipes])
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F7F8" }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>
        <TouchableOpacity onPress={() => router.navigate("/(app)/(tabs)/more" as any)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}>
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

        {loading && recipes.length === 0 ? (
          <View style={{ paddingVertical: 40, alignItems: "center" }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : recipes.length === 0 ? (
          <View style={{ backgroundColor: colors.card, borderRadius: 28, borderWidth: 1, borderColor: colors.border, padding: 36, alignItems: "center", marginBottom: 20 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "#F7F7F8", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <UtensilsCrossed size={28} color={colors.textMuted} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: "800", color: colors.textMain, marginBottom: 6 }}>No Recipes Yet</Text>
            <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: "600", textAlign: "center" }}>
              Upload your menu photo to generate AI recipe breakdowns automatically.
            </Text>
          </View>
        ) : (
          /* Recipe list */
          <View style={{ backgroundColor: colors.card, borderRadius: 28, borderWidth: 1, borderColor: colors.border, overflow: "hidden", marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 20, elevation: 2 }}>
            {recipes.map((recipe, idx) => (
              <TouchableOpacity
                key={recipe.id}
                onPress={() => router.push({ pathname: "/(app)/recipe-detail", params: { id: recipe.id, name: recipe.name } } as any)}
                activeOpacity={0.7}
                style={{ padding: 20, borderBottomWidth: idx < recipes.length - 1 ? 1 : 0, borderBottomColor: colors.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
              >
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: colors.textMain, letterSpacing: -0.2, marginBottom: 4 }}>{recipe.name}</Text>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textMuted }}>{recipe.ingredient_count} ingredient{recipe.ingredient_count !== 1 ? "s" : ""} mapped</Text>
                </View>
                <ChevronRight size={20} color={colors.textMuted} strokeWidth={2} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Add recipes button */}
        <TouchableOpacity
          onPress={() => router.push("/onboarding/upload-menu" as any)}
          activeOpacity={0.8}
          style={{ borderWidth: 2, borderStyle: "dashed", borderColor: colors.primary, borderRadius: 24, paddingVertical: 20, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}
        >
          <Plus size={20} color={colors.primary} strokeWidth={2.5} />
          <Text style={{ fontSize: 15, fontWeight: "800", color: colors.primary }}>Add Recipes from Menu</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
