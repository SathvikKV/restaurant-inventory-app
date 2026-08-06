import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Linking, TextInput, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowLeft, ExternalLink, Store, Link as LinkIcon, Save } from "lucide-react-native";
import { useAuth } from "../../lib/auth-context";
import { listRestaurants, linkSheet } from "../../lib/api";
import { colors } from "../../components/ui";

export default function WorkspaceSettingsScreen() {
  const { auth } = useAuth();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputUrls, setInputUrls] = useState<{ [key: string]: string }>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.token) return;
    listRestaurants(auth.token).then(data => {
      setRestaurants(data);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [auth.token]);

  const handleLinkSheet = async (restaurantId: string) => {
    const url = inputUrls[restaurantId];
    if (!url || !url.trim()) {
      Alert.alert("Invalid Input", "Please paste a valid Google Sheet ID or URL.");
      return;
    }
    setSavingId(restaurantId);
    try {
      const res = await linkSheet(auth.token!, restaurantId, url.trim());
      setRestaurants(prev =>
        prev.map(r => (r.id === restaurantId ? { ...r, sheet_url: res.sheet_url } : r))
      );
      setInputUrls(prev => ({ ...prev, [restaurantId]: "" }));
      Alert.alert("Success", "Google Sheet linked successfully!");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to link sheet. Verify editor access and try again.");
    } finally {
      setSavingId(null);
    }
  };

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
      <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
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
              gap: 16
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: "#F4F5F7", alignItems: "center", justifyContent: "center" }}>
                  <Store size={22} color={colors.textMain} />
                </View>
                <Text style={{ fontSize: 18, fontWeight: "800", color: colors.textMain, flex: 1 }}>{r.name}</Text>
              </View>

              {r.sheet_url ? (
                <View style={{ gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => Linking.openURL(r.sheet_url)}
                    style={{
                      backgroundColor: "#10B981",
                      borderRadius: 12,
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>Open Google Sheet</Text>
                    <ExternalLink size={18} color="#fff" strokeWidth={2.5} />
                  </TouchableOpacity>
                  <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: "center" }}>
                    Your workspace inventory and logs are actively syncing with this sheet.
                  </Text>
                </View>
              ) : (
                <Text style={{ fontSize: 14, color: colors.textMuted }}>No Google Sheet linked to this workspace.</Text>
              )}

              <View style={{
                backgroundColor: "#F9FAFC",
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: "#E5E7EB",
                gap: 12,
                marginTop: 4
              }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <LinkIcon size={16} color={colors.textMain} />
                  <Text style={{ fontSize: 15, fontWeight: "700", color: colors.textMain }}>
                    {r.sheet_url ? "Update Linked Sheet" : "Link Google Sheet"}
                  </Text>
                </View>
                
                <Text style={{ fontSize: 13, color: colors.textMuted, lineHeight: 18 }}>
                  Share this sheet with the email below, giving it Editor access, then paste the sheet's ID or URL here.
                </Text>
                
                <View style={{
                  backgroundColor: "#EEF2FF",
                  padding: 10,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: "#C7D2FE"
                }}>
                  <Text selectable style={{ fontSize: 13, color: "#3730A3", fontWeight: "600", fontFamily: "monospace" }}>
                    {r.service_account_email || "865041038171-compute@developer.gserviceaccount.com"}
                  </Text>
                </View>

                <TextInput
                  value={inputUrls[r.id] || ""}
                  onChangeText={txt => setInputUrls(prev => ({ ...prev, [r.id]: txt }))}
                  placeholder="Paste Sheet ID or https://docs.google.com/..."
                  placeholderTextColor="#9CA3AF"
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderWidth: 1,
                    borderColor: "#D1D5DB",
                    borderRadius: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    fontSize: 14,
                    color: colors.textMain
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <TouchableOpacity
                  onPress={() => handleLinkSheet(r.id)}
                  disabled={savingId === r.id}
                  style={{
                    backgroundColor: savingId === r.id ? "#93C5FD" : colors.primary,
                    borderRadius: 10,
                    paddingVertical: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
                    gap: 6
                  }}
                >
                  {savingId === r.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Save size={16} color="#fff" strokeWidth={2.5} />
                      <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Save Sheet Connection</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

