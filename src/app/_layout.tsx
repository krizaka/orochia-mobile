import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AgeGate } from "@/components/AgeGate";
import { AuthProvider, useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

/** The app: the 18+ gate first, then tabs and the detail screens, in the system's appearance. */
function Root() {
  const { c, dark } = useTheme();
  const { ageConfirmed, confirmAge } = useAuth();
  return (
    <>
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
      {ageConfirmed === false && <AgeGate onConfirm={() => void confirmAge()} />}
    </>
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
