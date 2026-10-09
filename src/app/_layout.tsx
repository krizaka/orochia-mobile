import React, { useEffect } from "react";
import { Stack } from "expo-router";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AgeGate } from "@/components/AgeGate";
import { LiveToast } from "@/components/LiveToast";
import { AuthProvider, useAuth } from "@/lib/auth";
import { openPath } from "@/lib/links";
import { LiveProvider } from "@/lib/live";
import { useTheme } from "@/lib/theme";

// In the foreground the live stream shows notifications as toasts; a push that arrives then stays in the list only.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

/** A tapped push opens what it is about (its `path`). */
function useOpenTappedPush() {
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const path = response.notification.request.content.data?.path;
      if (typeof path === "string") openPath(path);
    });
    return () => sub.remove();
  }, []);
}

/**
 * The app: the 18+ gate first, then tabs and the detail screens, in the system's appearance — with the live stream
 * (toasts, the account tab's badge) while signed in, and pushes opened where they point.
 */
function Root() {
  const { c, dark } = useTheme();
  const { ageConfirmed, confirmAge, user } = useAuth();
  useOpenTappedPush();
  return (
    <LiveProvider signedIn={Boolean(user)}>
      <StatusBar style={dark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: c.background },
          headerTintColor: c.text,
          headerShadowVisible: false,
          headerBackButtonDisplayMode: "minimal",
          contentStyle: { backgroundColor: c.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="watch/[id]" options={{ title: "" }} />
        <Stack.Screen name="challenges/[id]" options={{ title: "" }} />
        <Stack.Screen name="auctions/[id]" options={{ title: "" }} />
      </Stack>
      <LiveToast />
      {ageConfirmed === false && <AgeGate onConfirm={() => void confirmAge()} />}
    </LiveProvider>
  );
}

export default function Layout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
