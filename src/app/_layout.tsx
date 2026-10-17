import React from "react";
import { Stack } from "expo-router";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemeProvider, Toaster, useTheme } from "@krizaka/ui/native";
import { nativeTheme } from "@krizaka/orochia-design-system/tokens";
import { AgeGate } from "@/components/AgeGate";
import { Charts } from "@/components/Charts";
import { t } from "@/i18n";
import { AuthProvider, useAuth } from "@/lib/auth";
import { LiveProvider } from "@/lib/live";
import { useOpenTappedPush } from "@/lib/push";

// In the foreground the live stream shows notifications as toasts; a push that arrives then stays in the list only.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

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
    <Charts>
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
        <Stack.Screen name="messages/[id]" options={{ title: "" }} />
        <Stack.Screen name="messages/group/[id]" options={{ title: t("messages.group.info") }} />
        <Stack.Screen name="u/[handle]" options={{ title: "" }} />
        <Stack.Screen name="me/[section]" options={{ title: "" }} />
        <Stack.Screen name="settings/notifications" options={{ title: t("prefs.title") }} />
        <Stack.Screen name="auth/sign-up" options={{ title: "" }} />
      </Stack>
      <Toaster closeLabel={t("common.close")} offset={insets.top + 8} />
      {ageConfirmed === false && <AgeGate onConfirm={() => void confirmAge()} />}
    </LiveProvider>
    </Charts>
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
