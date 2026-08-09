import { useEffect, useRef } from "react";
import { Stack, router } from "expo-router";
import { Alert, Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useAuthStore } from "../../lib/auth-store";
import { registerPushToken } from "../../lib/api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function AppStackLayout() {
  const auth = useAuthStore();
  const responseListener = useRef<Notifications.EventSubscription>();

  useEffect(() => {
    if (!auth.token) {
      router.replace("/onboarding/welcome");
    }
  }, [auth.token]);

  useEffect(() => {
    if (!auth.token) return;

    async function registerForPushNotificationsAsync() {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          await new Promise<void>((resolve) => {
            Alert.alert(
              "Enable Notifications",
              "We need notifications to alert you about low stock and pending confirmations.",
              [
                { text: "Not Now", style: "cancel", onPress: () => resolve() },
                { 
                  text: "Enable", 
                  onPress: async () => {
                    const { status } = await Notifications.requestPermissionsAsync();
                    finalStatus = status;
                    resolve();
                  } 
                }
              ]
            );
          });
        }
        if (finalStatus !== 'granted') return;

        try {
          const pushTokenString = (await Notifications.getExpoPushTokenAsync({
            projectId: "03676612-e881-4ed6-944e-d2d34ce2cb76"
          })).data;
          await registerPushToken(auth.token!, pushTokenString);
        } catch (e) {
          console.error("Push token error", e);
        }
      }
    }

    registerForPushNotificationsAsync();

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data.type === 'confirmation') {
        router.push("/(app)/notifications");
      } else if (data.type === 'low_stock' && data.itemJson) {
        router.push({ pathname: "/(app)/item-detail", params: { itemJson: data.itemJson } });
      }
    });

    return () => {
      if (responseListener.current) Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, [auth.token]);

  if (!auth.token) return null;

  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="item-detail" />
      <Stack.Screen name="adjust-stock" />
      <Stack.Screen name="issue-stock" />
      <Stack.Screen name="receive-stock" />
      <Stack.Screen name="log-wastage" />
      <Stack.Screen name="invoice-history" />
      <Stack.Screen name="activity-history" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="scan-invoice" />
      <Stack.Screen name="recipes" />
      <Stack.Screen name="recipe-detail" />
    </Stack>
  );
}
