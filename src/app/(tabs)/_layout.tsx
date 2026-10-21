import React from "react";
import { Tabs } from "expo-router";
import { useTheme } from "@krizaka/ui/native";
import { t } from "@/i18n";
import { useLive } from "@/lib/live";
import { TABS } from "@/lib/tabs";

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
      {TABS.map(({ id, titleKey, icon: Icon }) => (
        <Tabs.Screen
          key={id}
          name={id}
          options={{
            title: t(titleKey),
            tabBarIcon: ({ color, size }) => <Icon color={color} size={size} />,
            ...(id === "messages" && messagesUnread > 0 ? { tabBarBadge: messagesUnread > 99 ? "99+" : messagesUnread } : {}),
            ...(id === "me" && unread > 0 ? { tabBarBadge: unread } : {}),
          }}
        />
      ))}
    </Tabs>
  );
}
