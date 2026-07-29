import { View, Text, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft, Lock, Camera, ImagePlus } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { colors } from "../../components/ui";

export default function UploadInvoiceScreen() {
  async function handlePick(useCamera: boolean) {
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Please grant permission to continue.");
      return;
    }
    const picked = useCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsEditing: true, mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (picked.canceled || !picked.assets?.[0]) return;
    router.push({ pathname: "/onboarding/processing", params: { imageUri: picked.assets[0].uri, mimeType: picked.assets[0].mimeType || "image/jpeg" } });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 48, justifyContent: "space-between" }}>
        <View>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 16, marginLeft: -12 }}>
            <ChevronLeft size={24} color={colors.textMain} strokeWidth={2} />
          </TouchableOpacity>

          <Text style={{ fontSize: 28, fontWeight: "800", color: colors.textMain, textAlign: "center", letterSpacing: -0.5, marginBottom: 12 }}>Teach SANQ</Text>
          <Text style={{ fontSize: 15, color: colors.textMuted, fontWeight: "600", textAlign: "center", lineHeight: 22, marginBottom: 24, maxWidth: 260, alignSelf: "center" }}>
            Take a photo or choose from your library.
          </Text>

          <TouchableOpacity
            onPress={() => handlePick(true)}
            activeOpacity={0.9}
            style={{ backgroundColor: colors.card, borderRadius: 28, borderWidth: 1, borderColor: colors.border, padding: 32, alignItems: "center", gap: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 20, elevation: 2, marginBottom: 16 }}
          >
            <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: "#E8F0EC", alignItems: "center", justifyContent: "center" }}>
              <Camera size={32} color={colors.primary} strokeWidth={2} />
            </View>
            <Text style={{ fontSize: 17, fontWeight: "800", color: colors.textMain }}>Take Photo</Text>
            <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: "600", textAlign: "center" }}>Use your camera to capture the invoice</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handlePick(false)}
            activeOpacity={0.9}
            style={{ backgroundColor: colors.card, borderRadius: 28, borderWidth: 1, borderColor: colors.border, padding: 32, alignItems: "center", gap: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 20, elevation: 2, marginBottom: 24 }}
          >
            <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: "#F5F3FF", alignItems: "center", justifyContent: "center" }}>
              <ImagePlus size={32} color="#7C3AED" strokeWidth={2} />
            </View>
            <Text style={{ fontSize: 17, fontWeight: "800", color: colors.textMain }}>Upload from Library</Text>
            <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: "600", textAlign: "center" }}>Choose an existing photo</Text>
          </TouchableOpacity>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, justifyContent: "center" }}>
            <Lock size={18} color="#059669" strokeWidth={2} />
            <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: "600", lineHeight: 18 }}>
              Your data is private and secure{"\n"}Only you can see your data.
            </Text>
          </View>
        </View>

        <View style={{ gap: 12 }}>
          <TouchableOpacity onPress={() => router.push("/onboarding/success")} style={{ paddingVertical: 12, alignItems: "center" }}>
            <Text style={{ fontSize: 15, fontWeight: "800", color: colors.textMain }}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
