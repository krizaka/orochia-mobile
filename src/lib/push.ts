import { useEffect } from "react";
import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { api } from "./api";
import { openPath } from "./links";
import { storage } from "./storage";

/**
 * Push notifications. After sign-in the app asks for permission once, gets its Expo push token (FCM on Android, APNs on
 * iOS behind it) and registers it with Orochia (`POST /api/me/devices`); sign-out forgets it. Nothing happens on an
 * iOS simulator (an Android emulator with Google APIs receives pushes like a phone), in a build without an EAS
 * project id, or when the person declines — the app works the same without push.
 */
const KEY = "orochia.pushToken";

export async function registerForPush(): Promise<string | null> {
  try {
    // An iOS simulator gets no push token; an Android emulator with Google Play services does (FCM), like a phone.
    if (!Device.isDevice && Platform.OS === "ios") return null;
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
  } catch (error) {
    if (__DEV__) console.warn("push: not registered", error);
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

/** The Orochia path a tapped notification opens (`data.path`, set by the server's lib/push.ts); anything else: none. */
export function pushPath(response: Notifications.NotificationResponse | null | undefined): string | null {
  const path = response?.notification.request.content.data?.path;
  return typeof path === "string" && path.startsWith("/") ? path : null;
}

/** Notifications already opened: the launch response stays "the last one" for the app's whole life. */
const handled = new Set<string>();
function open(response: Notifications.NotificationResponse | null | undefined) {
  const path = pushPath(response);
  if (!response || !path) return;
  const id = response.notification.request.identifier;
  if (handled.has(id)) return;
  handled.add(id);
  // The system keeps the launch response across launches: forget it, or every later start reopens that screen.
  Notifications.clearLastNotificationResponse();
  openPath(path);
}

/**
 * A tapped push opens what it is about — while the app runs (the listener) and when the tap is what launched it (the
 * last response, read once at start: without it a cold start lands on the home screen). Each notification once.
 */
export function useOpenTappedPush() {
  useEffect(() => {
    open(Notifications.getLastNotificationResponse());
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, []);
}
