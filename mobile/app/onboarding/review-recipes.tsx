import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react-native";
import { colors } from "../../components/ui";
import { useAuth } from "../../lib/auth-context";
import { saveRecipes, getUnits } from "../../lib/api";
import RecipeIngredientsEditor, { EditableIngredient, CATEGORIES } from "../../components/RecipeIngredientsEditor";

type EditableDish = {
  _id: string;
  dish_name: string;
  ingredients: EditableIngredient[];
};

export default function ReviewRecipesScreen() {
  const { recipesJson } = useLocalSearchParams<{ recipesJson?: string }>();
  const { auth } = useAuth();
  const [dishes, setDishes] = useState<EditableDish[]>([]);
  const [saving, setSaving] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [availableUnits, setAvailableUnits] = useState<string[]>(["piece"]);

  useEffect(() => {
    if (auth.token) {
      getUnits(auth.token).then(setAvailableUnits).catch(console.error);
    }
  }, [auth.token]);

  useEffect(() => {
    if (recipesJson) {
      try {
        const parsed = JSON.parse(recipesJson);
        const mapped: EditableDish[] = parsed.map((recipe: any) => ({
          _id: Math.random().toString(36).substring(2, 9),
          dish_name: recipe.dish_name || "",
          ingredients: (recipe.ingredients || []).map((ing: any) => ({
            _id: Math.random().toString(36).substring(2, 9),
            name: ing.name || "",
            category: CATEGORIES.includes(ing.category?.toLowerCase()) ? ing.category.toLowerCase() : "misc",
            unit: ing.unit?.toLowerCase() || "piece",
            quantity_per_serving: ing.quantity_per_serving ?? 0,
          })),
        }));
        setDishes(mapped);
      } catch (e) {
        console.error("Failed to parse recipes", e);
      }
    }
  }, [recipesJson]);

  const updateDishName = (idx: number, name: string) => {
    const updated = [...dishes];
    updated[idx].dish_name = name;
    setDishes(updated);
  };

  const updateDishIngredients = (idx: number, ingredients: EditableIngredient[]) => {
    const updated = [...dishes];
    updated[idx].ingredients = ingredients;
    setDishes(updated);
  };

  const removeDish = (idx: number) => {
    Alert.alert("Delete Dish", "Are you sure you want to remove this dish?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          const updated = [...dishes];
          updated.splice(idx, 1);
          setDishes(updated);
          if (expandedIndex === idx) setExpandedIndex(null);
        },
      },
    ]);
  };

  const addDish = () => {
    const newDish: EditableDish = {
      _id: Math.random().toString(36).substring(2, 9),
      dish_name: "",
      ingredients: [
        {
          _id: Math.random().toString(36).substring(2, 9),
          name: "",
          category: "misc",
          unit: "piece",
          quantity_per_serving: "1",
        },
      ],
    };
    setDishes([...dishes, newDish]);
    setExpandedIndex(dishes.length);
  };

  const handleSave = async () => {
    if (!auth.token) return;
    const validRecipes = dishes
      .filter((d) => d.dish_name.trim() !== "")
      .map((d) => ({
        dish_name: d.dish_name.trim(),
        ingredients: d.ingredients
          .filter((i) => i.name.trim() !== "")
          .map((i) => ({
            name: i.name.trim(),
            unit: i.unit,
            quantity_per_serving: Number(i.quantity_per_serving) || 0,
            category: i.category,
          })),
      }));

    if (validRecipes.length === 0) {
      Alert.alert("Empty List", "Please provide at least one valid dish with a name.");
      return;
    }

    setSaving(true);
    try {
      const res = await saveRecipes(auth.token, validRecipes);
      router.replace({
        pathname: "/onboarding/success",
        params: {
          recipesCreated: res.recipes_created.toString(),
          ingredientsSeeded: res.ingredients_seeded.toString(),
        },
      });
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save recipes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F7F8" }}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", marginLeft: -12 }}>
            <ChevronLeft size={24} color={colors.textMain} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={{ fontSize: 22, fontWeight: "800", color: colors.textMain, marginLeft: 8, letterSpacing: -0.5 }}>Review Recipes</Text>
        </View>

        <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: "600", marginBottom: 16, lineHeight: 20 }}>
          We inferred these dishes and ingredient estimates from your menu. Tap a dish to view and correct per-serving quantities.
        </Text>

        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          <View style={{ gap: 16 }}>
            {dishes.map((dish, idx) => {
              const isExpanded = expandedIndex === idx;
              const ingredientCount = dish.ingredients.filter((i) => i.name.trim() !== "").length;

              return (
                <View key={dish._id} style={{ backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: isExpanded ? colors.primary : colors.border, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 20, elevation: 2 }}>
                  {/* Dish Header */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setExpandedIndex(isExpanded ? null : idx)}
                    style={{ padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: isExpanded ? "#F7F7F8" : "white" }}
                  >
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <TextInput
                        value={dish.dish_name}
                        onChangeText={(val) => updateDishName(idx, val)}
                        placeholder="Dish Name (e.g. Butter Chicken)"
                        placeholderTextColor="#A0ADB4"
                        style={{ fontSize: 18, fontWeight: "800", color: colors.textMain, padding: 0, marginBottom: 4 }}
                      />
                      <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textMuted }}>
                        {ingredientCount} ingredient{ingredientCount !== 1 ? "s" : ""} mapped
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <TouchableOpacity onPress={() => removeDish(idx)} style={{ padding: 6 }}>
                        <Trash2 size={20} color="#EF4444" strokeWidth={2} />
                      </TouchableOpacity>
                      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isExpanded ? "#E8F0EC" : "#F7F7F8", alignItems: "center", justifyContent: "center" }}>
                        {isExpanded ? <ChevronUp size={20} color={colors.primary} strokeWidth={2.5} /> : <ChevronDown size={20} color={colors.textMuted} strokeWidth={2} />}
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Expanded Ingredients Section */}
                  {isExpanded && (
                    <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: "#FAFCFA" }}>
                      <Text style={{ fontSize: 13, fontWeight: "800", color: colors.primary, marginBottom: 12, letterSpacing: 0.5 }}>CORE INGREDIENTS BREAKDOWN</Text>
                      <RecipeIngredientsEditor units={availableUnits} ingredients={dish.ingredients} onChange={(updated) => updateDishIngredients(idx, updated)} />
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          <TouchableOpacity onPress={addDish} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 20, marginTop: 16, marginBottom: 32, borderRadius: 20, borderStyle: "dashed", borderWidth: 2, borderColor: colors.primary, backgroundColor: "#E8F0EC20" }}>
            <Plus size={22} color={colors.primary} strokeWidth={2.5} />
            <Text style={{ fontSize: 16, fontWeight: "800", color: colors.primary }}>Add Another Dish</Text>
          </TouchableOpacity>
        </ScrollView>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
          style={{ width: "100%", backgroundColor: colors.primary, borderRadius: 24, paddingVertical: 18, alignItems: "center", shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 4, marginTop: 12, opacity: saving ? 0.7 : 1 }}
        >
          {saving ? <ActivityIndicator color="white" /> : <Text style={{ color: "white", fontSize: 17, fontWeight: "800", letterSpacing: -0.3 }}>Save & Continue</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
