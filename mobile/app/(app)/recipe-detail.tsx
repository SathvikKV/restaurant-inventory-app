import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, Save } from "lucide-react-native";
import { colors } from "../../components/ui";
import { useAuth } from "../../lib/auth-context";
import { getRecipe, updateRecipeIngredients, getUnits } from "../../lib/api";
import RecipeIngredientsEditor, { EditableIngredient, CATEGORIES } from "../../components/RecipeIngredientsEditor";

export default function RecipeDetailScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { auth } = useAuth();
  const [recipeName, setRecipeName] = useState(name || "Recipe Details");
  const [ingredients, setIngredients] = useState<EditableIngredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availableUnits, setAvailableUnits] = useState<string[]>(["piece"]);

  useEffect(() => {
    async function load() {
      if (!auth.token || !id) return;
      try {
        setLoading(true);
        const units = await getUnits(auth.token).catch(() => ["piece"]);
        setAvailableUnits(units);
        
        const res = await getRecipe(auth.token, id as string);
        if (res.name) setRecipeName(res.name);
        const mapped: EditableIngredient[] = (res.ingredients || []).map((i: any) => ({
          _id: i.id || Math.random().toString(36).substring(2, 9),
          name: i.name || "",
          category: CATEGORIES.includes(i.category?.toLowerCase()) ? i.category.toLowerCase() : "misc",
          unit: i.unit?.toLowerCase() || "piece",
          quantity_per_serving: i.quantity_per_serving ?? 0,
        }));
        setIngredients(mapped);
      } catch (e: any) {
        Alert.alert("Error", e.message || "Failed to load recipe details");
        router.back();
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [auth.token, id]);

  const handleSave = async () => {
    if (!auth.token || !id) return;
    const validIngredients = ingredients
      .filter((i) => i.name.trim() !== "")
      .map((i) => ({
        name: i.name.trim(),
        unit: i.unit,
        quantity_per_serving: Number(i.quantity_per_serving) || 0,
        category: i.category,
      }));

    if (validIngredients.length === 0) {
      Alert.alert("Validation", "Please keep at least one valid ingredient in the recipe.");
      return;
    }

    try {
      setSaving(true);
      await updateRecipeIngredients(auth.token, id, validIngredients);
      Alert.alert("Updated!", "Recipe ingredients have been updated successfully.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save recipe updates");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F7F8" }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}>
          <ChevronLeft size={24} color={colors.textMain} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 20, fontWeight: "800", color: colors.textMain, marginLeft: 12, letterSpacing: -0.3 }}>{recipeName}</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, justifyContent: "space-between" }}>
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: "800", color: colors.primary, marginBottom: 16, letterSpacing: 0.5 }}>
              EDIT INGREDIENTS BREAKDOWN
            </Text>

            <RecipeIngredientsEditor units={availableUnits} ingredients={ingredients} onChange={setIngredients} style={{ marginBottom: 32 }} />
          </ScrollView>

          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
            style={{ width: "100%", backgroundColor: colors.primary, borderRadius: 24, paddingVertical: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 4, opacity: saving ? 0.7 : 1 }}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Save size={20} color="white" strokeWidth={2.5} />
                <Text style={{ color: "white", fontSize: 17, fontWeight: "800", letterSpacing: -0.3 }}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
