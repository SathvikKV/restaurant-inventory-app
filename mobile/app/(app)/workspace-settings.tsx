import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowLeft, ExternalLink, Store } from "lucide-react-native";
import { useAuth } from "../../lib/auth-context";
import { listRestaurants } from "../../lib/api";
import { colors } from "../../components/ui";

export default function WorkspaceSettingsScreen() {
  const { auth } = useAuth();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.token) return;
    listRestaurants(auth.token).then(data => {
      setRestaurants(data);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [auth.token]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F7F8" }}>
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
          <ArrowLeft size={24} color={colors.textMain} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: "800", color: colors.textMain }}>Workspace Settings</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          restaurants.map(r => (
            <View key={r.id} style={{
              backgroundColor: colors.card,
              borderRadius: 16,
              padding: 20,
              borderWidth: 1,
              borderColor: colors.border,
              gap: 12
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#F4F5F7", alignItems: "center", justifyContent: "center" }}>
                  <Store size={20} color={colors.textMain} />
                </View>
                <Text style={{ fontSize: 18, fontWeight: "800", color: colors.textMain }}>{r.name}</Text>
              </View>
              {r.sheet_url ? (
                <TouchableOpacity
                  onPress={() => Linking.openURL(r.sheet_url)}
                  style={{
                    backgroundColor: colors.primary,
                    borderRadius: 12,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    marginTop: 8
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>Open Google Sheet</Text>
                  <ExternalLink size={18} color="#fff" strokeWidth={2.5} />
                </TouchableOpacity>
              ) : (
                <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 4 }}>No Google Sheet linked to this workspace.</Text>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
