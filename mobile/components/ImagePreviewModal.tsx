import React from "react";
import { View, Modal, TouchableOpacity, Image, Dimensions } from "react-native";
import { X } from "lucide-react-native";

interface ImagePreviewModalProps {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
}

export function ImagePreviewModal({ visible, imageUri, onClose }: ImagePreviewModalProps) {
  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", alignItems: "center" }}>
        <TouchableOpacity
          style={{
            position: "absolute",
            top: 50,
            right: 24,
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: "rgba(255,255,255,0.2)",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
          }}
          onPress={onClose}
        >
          <X size={24} color="white" />
        </TouchableOpacity>
        {imageUri && (
          <Image
            source={{ uri: imageUri }}
            style={{ width: Dimensions.get("window").width * 0.95, height: Dimensions.get("window").height * 0.7, borderRadius: 16 }}
            resizeMode="contain"
          />
        )}
      </View>
    </Modal>
  );
}
