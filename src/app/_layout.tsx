import React, { useEffect } from "react";
import { Stack } from "expo-router";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemeProvider, Toaster, useTheme } from "@krizaka/ui/native";
import { nativeTheme } from "@krizaka/orochia-design-system/tokens";
import { AgeGate } from "@/components/AgeGate";
import { t } from "@/i18n";
import { AuthProvider, useAuth } from "@/lib/auth";
import { openPath } from "@/lib/links";
import { LiveProvider } from "@/lib/live";

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
 * The app: the 18+ gate first, then tabs and the detail screens, in the system's appearance under the Orochia theme
 * (`nativeTheme` over the @krizaka/ui roles) — with the live stream (toasts, the account tab's badge) while signed in,
 * and pushes opened where they point.
 */
function Root() {
  const { theme, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { ageConfirmed, confirmAge, user } = useAuth();
  useOpenTappedPush();
  return (
    <LiveProvider signedIn={Boolean(user)}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.surface0 },
          headerTintColor: theme.textPrimary,
          headerShadowVisible: false,
          headerBackButtonDisplayMode: "minimal",
          contentStyle: { backgroundColor: theme.surface0 },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="watch/[id]" options={{ title: "" }} />
        <Stack.Screen name="challenges/[id]" options={{ title: "" }} />
        <Stack.Screen name="auctions/[id]" options={{ title: "" }} />
      </Stack>
      <Toaster closeLabel={t("common.close")} offset={insets.top + 8} />
      {ageConfirmed === false && <AgeGate onConfirm={() => void confirmAge()} />}
    </LiveProvider>
  );
}

export default function Layout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider overrides={nativeTheme}>
        <AuthProvider>
          <Root />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
