import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal } from "react-native";
import { X, ChevronDown, Plus } from "lucide-react-native";
import { colors } from "./ui";

export const CATEGORIES = ["produce", "proteins", "dairy", "dry goods", "beverages", "bakery", "packaging", "cleaning", "misc"];

export type EditableIngredient = {
  _id: string;
  name: string;
  category: string;
  unit: string;
  quantity_per_serving: number | string;
};

type Props = {
  ingredients: EditableIngredient[];
  onChange: (updated: EditableIngredient[]) => void;
  units: string[];
  style?: any;
};

export default function RecipeIngredientsEditor({ ingredients, onChange, units, style }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerType, setPickerType] = useState<"category" | "unit" | null>(null);
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);

  const updateItem = (index: number, field: keyof EditableIngredient, value: string | number) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeItem = (index: number) => {
    const updated = [...ingredients];
    updated.splice(index, 1);
    onChange(updated);
  };

  const addItem = () => {
    const newItem: EditableIngredient = {
      _id: Math.random().toString(36).substring(2, 9),
      name: "",
      category: "misc",
      unit: "piece",
      quantity_per_serving: "1",
    };
    onChange([...ingredients, newItem]);
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

  return (
    <View style={[style, { gap: 12 }]}>
      {ingredients.map((item, idx) => (
        <View key={item._id} style={{ backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textMuted, marginBottom: 4, letterSpacing: 0.5 }}>INGREDIENT NAME</Text>
              <TextInput
                value={item.name}
                onChangeText={(val) => updateItem(idx, "name", val)}
                placeholder="e.g. Basmati Rice"
                placeholderTextColor="#A0ADB4"
                style={{ fontSize: 16, fontWeight: "700", color: colors.textMain, padding: 0 }}
              />
            </View>
            <View style={{ width: 80 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textMuted, marginBottom: 4, letterSpacing: 0.5 }}>QTY / SRV</Text>
              <TextInput
                value={String(item.quantity_per_serving ?? "")}
                onChangeText={(val) => updateItem(idx, "quantity_per_serving", val)}
                placeholder="0"
                placeholderTextColor="#A0ADB4"
                keyboardType="numeric"
                style={{ fontSize: 16, fontWeight: "700", color: colors.textMain, padding: 0, textAlign: "right", backgroundColor: "#F7F7F8", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}
              />
            </View>
            <TouchableOpacity onPress={() => removeItem(idx)} style={{ padding: 4, alignSelf: "flex-end", marginBottom: 2 }}>
              <X size={20} color="#EF4444" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textMuted, marginBottom: 4, letterSpacing: 0.5 }}>CATEGORY</Text>
              <TouchableOpacity onPress={() => openPicker(idx, "category")} style={{ backgroundColor: "#F7F7F8", borderRadius: 8, padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.textMain, textTransform: "capitalize" }}>{item.category}</Text>
                <ChevronDown size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textMuted, marginBottom: 4, letterSpacing: 0.5 }}>UNIT</Text>
              <TouchableOpacity onPress={() => openPicker(idx, "unit")} style={{ backgroundColor: "#F7F7F8", borderRadius: 8, padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.textMain }}>{item.unit}</Text>
                <ChevronDown size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ))}

      <TouchableOpacity onPress={addItem} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 16, borderRadius: 16, borderStyle: "dashed", borderWidth: 1.5, borderColor: colors.primary, backgroundColor: "#E8F0EC30" }}>
        <Plus size={18} color={colors.primary} strokeWidth={2.5} />
        <Text style={{ fontSize: 14, fontWeight: "800", color: colors.primary }}>Add Ingredient</Text>
      </TouchableOpacity>

      <Modal visible={pickerOpen} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "white", padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "80%" }}>
            <Text style={{ fontSize: 18, fontWeight: "800", marginBottom: 16, color: colors.textMain }}>
              Select {pickerType === "category" ? "Category" : "Unit"}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {(pickerType === "category" ? CATEGORIES : units).map((opt) => (
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
    </View>
  );
}
