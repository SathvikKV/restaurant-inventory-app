import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, FlatList, TextInput, ActivityIndicator, Modal } from "react-native";
import { X } from "lucide-react-native";
import { getInventory } from "../lib/api";
import { colors } from "./ui";
import { CategoryIcon } from "./CategoryIcon";

type Item = { id: string; name: string; unit: string; quantity: number; category: string | null; status: string };

export function SelectItemSheet({
  visible,
  token,
  onSelect,
  onClose,
}: {
  visible: boolean;
  token: string;
  onSelect: (item: Item) => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || !token) return;
    setLoading(true);
    getInventory(token)
      .then(data => setItems(data.map(i => ({ id: i.id, name: i.item, unit: i.unit, quantity: i.current_qty, category: i.category, status: i.status }))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [visible, token]);

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#F7F7F8" }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, backgroundColor: "white", borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <TouchableOpacity onPress={onClose} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#F4F5F7", alignItems: "center", justifyContent: "center" }}>
            <X size={20} color={colors.textMain} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={{ fontSize: 17, fontWeight: "800", color: colors.textMain, letterSpacing: -0.3 }}>Select Item</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Search */}
        <View style={{ paddingHorizontal: 24, paddingVertical: 16 }}>
          <View style={{ backgroundColor: "white", borderRadius: 20, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, height: 48, flexDirection: "row", alignItems: "center", gap: 10 }}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search ingredient..."
              placeholderTextColor={colors.textMuted}
              autoFocus
              style={{ flex: 1, fontSize: 15, fontWeight: "600", color: colors.textMain, padding: 0 }}
            />
          </View>
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={i => i.id}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40, gap: 10 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => { onSelect(item); onClose(); }}
                activeOpacity={0.95}
                style={{ backgroundColor: "white", borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 16, flexDirection: "row", alignItems: "center", gap: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 20, elevation: 2 }}
              >
                <CategoryIcon category={item.category} size={52} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: colors.textMain, letterSpacing: -0.2, marginBottom: 4 }}>{item.name}</Text>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textMuted }}>{parseFloat(item.quantity.toFixed(2))} {item.unit} available</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </Modal>
  );
}
