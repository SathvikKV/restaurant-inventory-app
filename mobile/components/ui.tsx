import { View, Text, TouchableOpacity, TextInput } from "react-native";
import {
  Home, Package, BarChart2, Menu, Bell, Search,
  ChevronRight, ChevronLeft, ChevronDown, ChevronUp,
  Check, X, AlertCircle, Scan, FileText, Receipt,
  PenLine, Trash2, Plus, User, Users, LogOut, LogIn,
  TrendingUp, Camera, Download, Upload, MapPin,
  MoreVertical, Leaf, MessageCircle, Clock,
} from "lucide-react-native";

// Color tokens
export const colors = {
  bg: "#F7F7F8",
  card: "#FFFFFF",
  primary: "#1B4D36",
  primaryLight: "#E8F0EC",
  accent: "#2B8A5A",
  textMain: "#111418",
  textMuted: "#687076",
  border: "#EAECEF",
};

// Icon map
export const icons = {
  home: Home,
  package: Package,
  barChart: BarChart2,
  menu: Menu,
  bell: Bell,
  search: Search,
  chevronRight: ChevronRight,
  chevronLeft: ChevronLeft,
  chevronDown: ChevronDown,
  chevronUp: ChevronUp,
  check: Check,
  x: X,
  alertCircle: AlertCircle,
  scan: Scan,
  fileText: FileText,
  receipt: Receipt,
  penTool: PenLine,
  trash: Trash2,
  plus: Plus,
  user: User,
  users: Users,
  logOut: LogOut,
  logIn: LogIn,
  trendingUp: TrendingUp,
  camera: Camera,
  download: Download,
  upload: Upload,
  mapPin: MapPin,
  moreVertical: MoreVertical,
  leaf: Leaf,
  messageCircle: MessageCircle,
  clock: Clock,
};

type IconName = keyof typeof icons;

export function Icon({ name, size = 20, color = colors.textMain }: { name: IconName; size?: number; color?: string }) {
  const LucideIcon = icons[name];
  if (!LucideIcon) return null;
  return <LucideIcon size={size} color={color} strokeWidth={2} />;
}

// SANQ wordmark logo
export function MiseLogo({ size = "header" }: { size?: "hero" | "header" | "small" }) {
  const fontSize = size === "hero" ? 28 : size === "header" ? 16 : 13;
  const dotSize = size === "hero" ? 8 : size === "header" ? 5 : 4;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: dotSize, height: dotSize, borderRadius: dotSize / 2, backgroundColor: colors.primary }} />
      <Text style={{
        fontSize,
        fontWeight: "800",
        letterSpacing: 4,
        color: colors.primary,
      }}>SANQ</Text>
    </View>
  );
}

// Card container
export function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View style={[{
      backgroundColor: colors.card,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 20,
      elevation: 2,
    }, style]}>
      {children}
    </View>
  );
}

// Primary button
export function PrimaryButton({ label, onPress, disabled, loading }: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={{
        backgroundColor: disabled ? "#A0ADB4" : colors.primary,
        borderRadius: 100,
        paddingVertical: 18,
        alignItems: "center",
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: disabled ? 0 : 0.3,
        shadowRadius: 20,
        elevation: disabled ? 0 : 4,
      }}
    >
      <Text style={{ color: "white", fontSize: 17, fontWeight: "800", letterSpacing: -0.3 }}>{label}</Text>
    </TouchableOpacity>
  );
}

// Secondary button
export function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        borderRadius: 100,
        paddingVertical: 18,
        alignItems: "center",
        borderWidth: 1.5,
        borderColor: colors.border,
        backgroundColor: colors.card,
      }}
    >
      <Text style={{ color: colors.textMain, fontSize: 17, fontWeight: "700", letterSpacing: -0.3 }}>{label}</Text>
    </TouchableOpacity>
  );
}

// Input field
export function InputField({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
  autoFocus,
  iconName,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: any;
  autoFocus?: boolean;
  iconName?: IconName;
}) {
  return (
    <View style={{
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    }}>
      {iconName && <Icon name={iconName} size={18} color={colors.textMuted} />}
      <View style={{ flex: 1 }}>
        {label && <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textMuted, marginBottom: 2, letterSpacing: 0.5 }}>{label}</Text>}
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType={keyboardType}
          autoFocus={autoFocus}
          style={{ fontSize: 16, fontWeight: "700", color: colors.textMain, padding: 0 }}
        />
      </View>
    </View>
  );
}

// Search field
export function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={{
      backgroundColor: colors.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      height: 48,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.03,
      shadowRadius: 20,
      elevation: 1,
    }}>
      <Icon name="search" size={18} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={{ flex: 1, fontSize: 15, fontWeight: "700", color: colors.textMain, padding: 0 }}
      />
    </View>
  );
}

// Back button
export function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon name="chevronLeft" size={26} color={colors.textMain} />
    </TouchableOpacity>
  );
}
