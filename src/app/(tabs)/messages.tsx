import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckCheck, MessageCircle } from "lucide-react-native";
import { Badge, Button, EmptyState, Skeleton, Txt, useTheme } from "@krizaka/ui/native";
import { PresenceAvatar, ago, presenceLabel } from "@/components/PresenceAvatar";
import { t } from "@/i18n";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { applyMessageToList, applyReceiptToList, type Conversation, markListRead, type PresenceView, type ServerMessage } from "@/lib/chat";
import { withTap } from "@/lib/haptics";
import { setOnMessagesTab, useLiveEvents } from "@/lib/live";
import { space } from "@/lib/theme";

interface OnlinePerson {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  presence: PresenceView;
}

/** Conversations, live: presence, the last message (or "typing…"), its receipt, unread counts; "Online now" on top. */
export default function Messages() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [list, setList] = useState<Conversation[] | null>(null);
  const [presence, setPresence] = useState<Record<string, PresenceView>>({});
  const [online, setOnline] = useState<OnlinePerson[]>([]);
  const [typing, setTyping] = useState<Record<string, number>>({});
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [convs, now] = await Promise.all([api<{ conversations: Conversation[] }>("/api/conversations"), api<{ online: OnlinePerson[] }>("/api/presence/online")]);
      setList(convs.conversations);
      setPresence(Object.fromEntries(convs.conversations.filter((c) => c.presence).map((c) => [c.otherUser.id, c.presence!])));
      setOnline(now.online);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setOnMessagesTab(true);
      if (user) void load();
      return () => setOnMessagesTab(false);
    }, [user, load]),
  );

  useEffect(() => {
    if (Object.keys(typing).length === 0) return;
    const timer = setInterval(() => setTyping((all) => Object.fromEntries(Object.entries(all).filter(([, until]) => until > Date.now()))), 1000);
    return () => clearInterval(timer);
  }, [typing]);

  useLiveEvents((event) => {
    if (!user) return;
    if (event.type === "connected" || event.type === "circle_changed" || event.type === "resync") return void load();
    if (event.type === "new_message" || event.type === "message_sent") {
      const message = event.message as ServerMessage;
      setList((current) => {
        if (!current) return current;
        const next = applyMessageToList(current, message, user.id, false);
        if (!next) void load();
        return next ?? current;
      });
      setTyping((all) => {
        const next = { ...all };
        delete next[message.conversationId];
        return next;
      });
    }
    if (event.type === "receipt") setList((current) => current && applyReceiptToList(current, user.id, event as never));
    if (event.type === "read") setList((current) => current && markListRead(current, String(event.conversationId)));
    if (event.type === "typing" && event.userId !== user.id) {
      setTyping((all) => {
        const next = { ...all };
        if (event.typing) next[String(event.conversationId)] = Date.now() + 6000;
        else delete next[String(event.conversationId)];
        return next;
      });
    }
    if (event.type === "presence") {
      const view = { state: event.state, lastSeenAt: event.lastSeenAt } as PresenceView;
      setPresence((all) => ({ ...all, [String(event.userId)]: view }));
      setOnline((people) => (view.state === "offline" ? people.filter((p) => p.id !== event.userId) : people.map((p) => (p.id === event.userId ? { ...p, presence: view } : p))));
      if (view.state !== "offline") void api<{ online: OnlinePerson[] }>("/api/presence/online").then((r) => setOnline(r.online)).catch(() => undefined);
    }
    if (event.type === "presence_snapshot") setPresence((all) => ({ ...all, ...(event.presence as Record<string, PresenceView>) }));
  });

  if (!user) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top + space.xl, paddingHorizontal: space.lg }}>
        <EmptyState icon={<MessageCircle size={24} color={theme.accent} />} title={t("messages.signIn")} />
      </View>
    );
  }

  return (
    <FlatList
      data={list ?? []}
      keyExtractor={(c) => c.id}
      contentContainerStyle={{ paddingTop: insets.top + space.md, paddingBottom: space.xxl }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={theme.accent}
          onRefresh={() => {
            setRefreshing(true);
            void load().finally(() => setRefreshing(false));
          }}
        />
      }
      ListHeaderComponent={
        <View style={{ gap: space.sm, paddingHorizontal: space.lg, marginBottom: space.md }}>
          <Txt variant="display">{t("messages.title")}</Txt>
          <Txt tone="secondary">{t("messages.subtitle")}</Txt>
          <Button label={t("messages.group.new")} variant="secondary" size="lg" onPress={withTap(() => router.push("/messages/new-group"))} />
          {online.length > 0 && (
            <View style={{ marginTop: space.sm, gap: space.sm }}>
              <Txt variant="label" tone="secondary">
                {t("messages.onlineNow")}
              </Txt>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.md }}>
                {online.map((p) => {
                  const conversation = list?.find((c) => c.otherUser.id === p.id);
                  return (
                    <Pressable
                      key={p.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${p.displayName}, ${presenceLabel(p.presence) ?? ""}`}
                      disabled={!conversation}
                      onPress={withTap(() => conversation && router.push(`/messages/${conversation.id}`))}
                      style={{ width: 60, alignItems: "center", gap: 4 }}
                    >
                      <PresenceAvatar src={p.avatarUrl} name={p.displayName} presence={p.presence} size={52} />
                      <Txt variant="caption" tone="secondary" numberOfLines={1}>
                        {p.displayName}
                      </Txt>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}
          {list === null && !error && [0, 1, 2].map((i) => <Skeleton key={i} shape="rect" height={64} />)}
        </View>
      }
      ListEmptyComponent={
        list === null && !error ? null : (
          <View style={{ paddingHorizontal: space.lg }}>
            <EmptyState icon={<MessageCircle size={24} color={theme.accent} />} title={error ? t("messages.error") : t("messages.empty")} description={error ? undefined : t("messages.emptyBody")} />
          </View>
        )
      }
      ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: theme.borderSubtle, marginLeft: space.lg + 56 }} />}
      renderItem={({ item: c }) => {
        const last = c.lastMessage;
        const mine = last?.senderId === user.id;
        const isTyping = Boolean(typing[c.id]);
        const view = presence[c.otherUser.id];
        const preview = isTyping ? t("messages.typing") : last ? (mine ? t("messages.you", { text: last.content }) : last.content) : t("messages.noMessages");
        const label = [c.otherUser.displayName, presenceLabel(view), c.unreadCount ? t("messages.unread", { count: c.unreadCount }) : null, preview].filter(Boolean).join(", ");
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={withTap(() => router.push(`/messages/${c.id}`))}
            style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, backgroundColor: pressed ? theme.surface2 : "transparent" })}
          >
            <PresenceAvatar src={c.otherUser.avatarUrl} name={c.otherUser.displayName} presence={view} />
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: space.sm }}>
                <Txt numberOfLines={1} style={{ flex: 1, fontWeight: c.unreadCount ? "800" : "600" }}>
                  {c.otherUser.displayName}
                </Txt>
                {last && (
                  <Txt variant="caption" tone="muted">
                    {ago(last.createdAt)}
                  </Txt>
                )}
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: space.xs }}>
                {mine && last && !isTyping && <CheckCheck size={14} color={last.isRead ? theme.accent : theme.textMuted} />}
                <Txt numberOfLines={1} tone={isTyping ? "accent" : c.unreadCount ? "text" : "secondary"} style={{ flex: 1 }}>
                  {preview}
                </Txt>
                {c.unreadCount > 0 && <Badge tone="accent">{c.unreadCount > 99 ? "99+" : String(c.unreadCount)}</Badge>}
              </View>
            </View>
          </Pressable>
        );
      }}
    />
  );
}
