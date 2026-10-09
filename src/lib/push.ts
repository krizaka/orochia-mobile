import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { api } from "./api";
import { storage } from "./storage";

/**
 * Push notifications. After sign-in the app asks for permission once, gets its Expo push token (FCM on Android, APNs on
 * iOS behind it) and registers it with Orochia (`POST /api/me/devices`); sign-out forgets it. Nothing happens on a
 * simulator, in a build without an EAS project id, or when the person declines — the app works the same without push.
 */
const KEY = "orochia.pushToken";

export async function registerForPush(): Promise<string | null> {
  try {
    if (!Device.isDevice) return null;
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", { name: "Orochia", importance: Notifications.AndroidImportance.HIGH });
    }
    const current = await Notifications.getPermissionsAsync();
    const granted = current.granted || (await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } })).granted;
    if (!granted) return null;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return null;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await api("/api/me/devices", { method: "POST", body: { token, platform: Platform.OS === "ios" ? "ios" : "android" } });
    await storage.set(KEY, token);
    return token;
  } catch {
    return null;
  }
}

/** Forgets this phone on the server (before the session is dropped). */
export async function unregisterPush(): Promise<void> {
  try {
    const token = await storage.get(KEY);
    if (!token) return;
    await api("/api/me/devices", { method: "DELETE", body: { token } });
    await storage.remove(KEY);
  } catch {
    // Signed out anyway; the server drops the token when the push service reports it dead.
  }
}
