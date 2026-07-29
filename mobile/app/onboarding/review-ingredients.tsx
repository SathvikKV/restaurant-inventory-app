import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, Plus, X, ChevronDown } from "lucide-react-native";
import { colors } from "../../components/ui";
import { useAuth } from "../../lib/auth-context";
import { saveMenuIngredients } from "../../lib/api";

const CATEGORIES = ["produce", "proteins", "dairy", "dry goods", "beverages", "bakery", "packaging", "cleaning", "misc"];
const UNITS = ["kg", "g", "litre", "ml", "piece", "packet", "dozen", "bottle", "other"];

type Ingredient = { name: string; category: string; unit: string; _id: string };

export default function ReviewIngredientsScreen() {
  const { ingredientsJson } = useLocalSearchParams<{ ingredientsJson?: string }>();
  const { auth } = useAuth();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [saving, setSaving] = useState(false);

  // Picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerType, setPickerType] = useState<"category" | "unit" | null>(null);
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);

  useEffect(() => {
    if (ingredientsJson) {
      try {
        const parsed = JSON.parse(ingredientsJson);
        const mapped = parsed.map((ing: any) => ({
          name: ing.name || "",
          category: CATEGORIES.includes(ing.category?.toLowerCase()) ? ing.category.toLowerCase() : "misc",
          unit: UNITS.includes(ing.unit?.toLowerCase()) ? ing.unit.toLowerCase() : "other",
          _id: Math.random().toString(36).substr(2, 9),
        }));
        setIngredients(mapped);
      } catch (e) {
        console.error("Failed to parse ingredients", e);
      }
    }
  }, [ingredientsJson]);

  const updateItem = (index: number, field: keyof Ingredient, value: string) => {
    const updated = [...ingredients];
    updated[index][field] = value;
    setIngredients(updated);
  };

  const removeItem = (index: number) => {
    const updated = [...ingredients];
    updated.splice(index, 1);
    setIngredients(updated);
  };

  const addItem = () => {
    setIngredients([...ingredients, { name: "", category: "misc", unit: "piece", _id: Math.random().toString(36).substr(2, 9) }]);
  };

  const openPicker = (index: number, type: "category" | "unit") => {
    setPickerIndex(index);
    setPickerType(type);
    setPickerOpen(true);
  };

  const selectPickerValue = (value: string) => {
    if (pickerIndex !== null && pickerType) {
      updateItem(pickerIndex, pickerType, value);
    }
    setPickerOpen(false);
  };

  const handleSave = async () => {
    if (!auth.token) return;
    const validIngredients = ingredients.filter(i => i.name.trim() !== "");
    if (validIngredients.length === 0) {
      Alert.alert("Empty List", "Please add at least one ingredient.");
      return;
    }
    setSaving(true);
    try {
      await saveMenuIngredients(auth.token, validIngredients);
      router.replace({ pathname: "/onboarding/success", params: { itemCount: validIngredients.length.toString() } });
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save ingredients");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F7F8" }}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 24 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", marginLeft: -12 }}>
            <ChevronLeft size={24} color={colors.textMain} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: "800", color: colors.textMain, marginLeft: 8 }}>Review Ingredients</Text>
        </View>

        <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: "600", marginBottom: 16 }}>
          We extracted these ingredients from your menu. Edit, add, or remove as needed.
        </Text>

        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          <View style={{ gap: 16 }}>
            {ingredients.map((item, idx) => (
              <View key={item._id} style={{ backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 12 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <TextInput
                    value={item.name}
                    onChangeText={(val) => updateItem(idx, "name", val)}
                    placeholder="Ingredient Name"
                    style={{ flex: 1, fontSize: 16, fontWeight: "700", color: colors.textMain, padding: 0 }}
                  />
                  <TouchableOpacity onPress={() => removeItem(idx)} style={{ padding: 4 }}>
                    <X size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: "row", gap: 12 }}>
                  <TouchableOpacity onPress={() => openPicker(idx, "category")} style={{ flex: 1, backgroundColor: "#F7F7F8", borderRadius: 8, padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: colors.textMain, textTransform: "capitalize" }}>{item.category}</Text>
                    <ChevronDown size={16} color={colors.textMuted} />
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => openPicker(idx, "unit")} style={{ flex: 1, backgroundColor: "#F7F7F8", borderRadius: 8, padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: colors.textMain }}>{item.unit}</Text>
                    <ChevronDown size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity onPress={addItem} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 20, marginTop: 12, marginBottom: 24, borderRadius: 16, borderStyle: "dashed", borderWidth: 2, borderColor: colors.border }}>
            <Plus size={20} color={colors.primary} strokeWidth={2.5} />
            <Text style={{ fontSize: 15, fontWeight: "800", color: colors.primary }}>Add Ingredient</Text>
          </TouchableOpacity>
        </ScrollView>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
          style={{ width: "100%", backgroundColor: colors.primary, borderRadius: 24, paddingVertical: 18, alignItems: "center", shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 4, marginTop: 16, opacity: saving ? 0.7 : 1 }}
        >
          {saving ? <ActivityIndicator color="white" /> : <Text style={{ color: "white", fontSize: 17, fontWeight: "800", letterSpacing: -0.3 }}>Save & Continue</Text>}
        </TouchableOpacity>
      </View>

      <Modal visible={pickerOpen} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "white", padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "80%" }}>
            <Text style={{ fontSize: 18, fontWeight: "800", marginBottom: 16, color: colors.textMain }}>
              Select {pickerType === "category" ? "Category" : "Unit"}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {(pickerType === "category" ? CATEGORIES : UNITS).map((opt) => (
                <TouchableOpacity
                  key={opt}
                  onPress={() => selectPickerValue(opt)}
                  style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}
                >
                  <Text style={{ fontSize: 16, color: colors.textMain, fontWeight: "600", textTransform: pickerType === "category" ? "capitalize" : "none" }}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={() => setPickerOpen(false)} style={{ marginTop: 16, alignItems: "center", paddingVertical: 12 }}>
              <Text style={{ fontSize: 16, color: colors.textMuted, fontWeight: "800" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
