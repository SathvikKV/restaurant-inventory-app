import { View } from "react-native";
import { Leaf, Beef, Milk, Wheat, Droplets, Coffee, Flame, Package } from "lucide-react-native";
import { colors } from "./ui";

const CATEGORY_MAP: Record<string, { Icon: any; bg: string; color: string }> = {
  veg: { Icon: Leaf, bg: "#ECFDF5", color: "#059669" },
  produce: { Icon: Leaf, bg: "#ECFDF5", color: "#059669" },
  meat: { Icon: Beef, bg: "#FEF2F2", color: "#DC2626" },
  dairy: { Icon: Milk, bg: "#EFF6FF", color: "#2563EB" },
  grains: { Icon: Wheat, bg: "#FEFCE8", color: "#CA8A04" },
  oil: { Icon: Droplets, bg: "#FFF7ED", color: "#EA580C" },
  beverages: { Icon: Coffee, bg: "#F5F3FF", color: "#7C3AED" },
  spices: { Icon: Flame, bg: "#FFF7ED", color: "#EA580C" },
};

export function CategoryIcon({ category, size = 56 }: { category: string | null; size?: number }) {
  const key = (category || "").toLowerCase();
  const match = CATEGORY_MAP[key] || { Icon: Package, bg: "#F4F5F7", color: colors.textMuted };
  const iconSize = size * 0.43;

  return (
    <View style={{
      width: size,
      height: size,
      borderRadius: size * 0.32,
      backgroundColor: match.bg,
      borderWidth: 1,
      borderColor: match.bg,
      alignItems: "center",
      justifyContent: "center",
    }}>
      <match.Icon size={iconSize} color={match.color} strokeWidth={2} />
    </View>
  );
}
