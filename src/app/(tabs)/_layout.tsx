import React from "react";
import { Tabs } from "expo-router";
import { Flame, Gavel, House, MessageCircle, UserRound } from "lucide-react-native";
import { useTheme } from "@krizaka/ui/native";
import { t } from "@/i18n";
import { useLive } from "@/lib/live";

/** Five places: the feed, challenges, auctions, messages (live, with their unread count) and the account. */
export default function TabsLayout() {
  const { theme } = useTheme();
  const { unread, messagesUnread } = useLive();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: { backgroundColor: theme.surface0, borderTopColor: theme.borderDefault },
        sceneStyle: { backgroundColor: theme.surface0 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t("tabs.home"), tabBarIcon: ({ color, size }) => <House color={color} size={size} /> }} />
      <Tabs.Screen name="challenges" options={{ title: t("tabs.challenges"), tabBarIcon: ({ color, size }) => <Flame color={color} size={size} /> }} />
      <Tabs.Screen name="auctions" options={{ title: t("tabs.auctions"), tabBarIcon: ({ color, size }) => <Gavel color={color} size={size} /> }} />
      <Tabs.Screen
        name="messages"
        options={{ title: t("tabs.messages"), tabBarBadge: messagesUnread > 0 ? (messagesUnread > 99 ? "99+" : messagesUnread) : undefined, tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} /> }}
      />
      <Tabs.Screen name="me" options={{ title: t("tabs.me"), tabBarBadge: unread > 0 ? unread : undefined, tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} /> }} />
    </Tabs>
  );
}
