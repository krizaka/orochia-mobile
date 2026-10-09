import React from "react";
import { Tabs } from "expo-router";
import { Flame, Gavel, House, UserRound } from "lucide-react-native";
import { t } from "@/i18n";
import { useTheme } from "@/lib/theme";

/** Four places: the feed, challenges, auctions and the account (wallet, notifications). */
export default function TabsLayout() {
  const { c } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.textTertiary,
        tabBarStyle: { backgroundColor: c.background, borderTopColor: c.border },
        sceneStyle: { backgroundColor: c.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t("tabs.home"), tabBarIcon: ({ color, size }) => <House color={color} size={size} /> }} />
      <Tabs.Screen name="challenges" options={{ title: t("tabs.challenges"), tabBarIcon: ({ color, size }) => <Flame color={color} size={size} /> }} />
      <Tabs.Screen name="auctions" options={{ title: t("tabs.auctions"), tabBarIcon: ({ color, size }) => <Gavel color={color} size={size} /> }} />
      <Tabs.Screen name="me" options={{ title: t("tabs.me"), tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} /> }} />
    </Tabs>
  );
}
