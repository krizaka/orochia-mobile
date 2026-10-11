import React, { useCallback, useRef, useState } from "react";
import { AccessibilityInfo, AppState, FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, CheckCheck, MessageCircle, Send } from "lucide-react-native";
import { Button, EmptyState, IconButton, Skeleton, Txt, useTheme } from "@krizaka/ui/native";
import { PresenceAvatar, presenceLabel } from "@/components/PresenceAvatar";
import { t } from "@/i18n";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { applyReceipt, type ChatMessage, type Conversation, mergeMessages, type PresenceView, receiptOf, type ServerMessage, uuid } from "@/lib/chat";
import { withTap } from "@/lib/haptics";
import { setViewingConversation, useLiveEvents } from "@/lib/live";
import { space } from "@/lib/theme";

const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/**
 * One conversation, live (orochia://messages/<id>): messages as they arrive, "typing…", receipts on the last message
 * sent, presence in the header, sending shown at once and retried with the same clientId (never doubled). Read as soon
 * as it is on screen; new messages are announced to screen readers.
 */
export default function Thread() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { theme, radius } = useTheme();
  const { user } = useAuth();
  const myId = user?.id ?? "";
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [presence, setPresence] = useState<PresenceView | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(false);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const typingSent = useRef(0);
  const typingStop = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const [page, list] = await Promise.all([
        api<{ messages: ServerMessage[]; hasMore: boolean }>(`/api/conversations/${id}/messages`),
        api<{ conversations: Conversation[] }>("/api/conversations"),
      ]);
      const c = list.conversations.find((x) => x.id === id) ?? null;
      setConversation(c);
      setPresence(c?.presence);
      setMessages((current) => mergeMessages(current, page.messages));
      setHasMore(page.hasMore);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // On screen: its messages arrive here (no toast), and it is (re)loaded — also when coming back to it.
  useFocusEffect(
    useCallback(() => {
      setViewingConversation(id);
      void load();
      return () => setViewingConversation(null);
    }, [id, load]),
  );

  // "typing…" fades after 6 s without a new signal.
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showTyping = (on: boolean) => {
    if (typingTimer.current) clearTimeout(typingTimer.current);
    setTyping(on);
    if (on) typingTimer.current = setTimeout(() => setTyping(false), 6000);
  };

  const markRead = (upTo?: number) => void api(`/api/conversations/${id}/read`, { method: "POST", body: upTo ? { upTo } : {} }).catch(() => undefined);

  useLiveEvents((event) => {
    if (event.type === "connected" || event.type === "resync") return void load();
    if ((event.type === "new_message" || event.type === "message_sent") && (event.message as ServerMessage).conversationId === id) {
      const message = event.message as ServerMessage;
      setMessages((current) => mergeMessages(current, [message]));
      if (event.type === "new_message") {
        showTyping(false);
        if (AppState.currentState === "active") markRead(message.seq);
        AccessibilityInfo.announceForAccessibility(message.content);
      }
    }
    if (event.type === "receipt" && event.conversationId === id) setMessages((current) => applyReceipt(current, myId, event as never));
    if (event.type === "typing" && event.conversationId === id && event.userId !== myId) showTyping(Boolean(event.typing));
    if ((event.type === "presence" && event.userId === conversation?.otherUser.id) || event.type === "presence_snapshot") {
      const view =
        event.type === "presence"
          ? ({ state: event.state, lastSeenAt: event.lastSeenAt } as PresenceView)
          : (event.presence as Record<string, PresenceView>)[conversation?.otherUser.id ?? ""];
      if (view) setPresence(view);
    }
  });

  const post = async (message: ChatMessage) => {
    try {
      const res = await api<{ message: ServerMessage }>(`/api/conversations/${id}/messages`, { method: "POST", body: { content: message.content, clientId: message.clientId } });
      setMessages((current) => mergeMessages(current, [res.message]));
    } catch {
      setMessages((current) => current.map((m) => (m.clientId === message.clientId && m.local ? { ...m, local: "failed" } : m)));
    }
  };

  const send = () => {
    const text = draft.trim();
    if (!text || !conversation) return;
    const clientId = uuid();
    const local: ChatMessage = {
      id: `local-${clientId}`,
      seq: 0,
      clientId,
      conversationId: id,
      senderId: myId,
      recipientId: conversation.otherUser.id,
      content: text,
      storyId: null,
      deliveredAt: null,
      isRead: false,
      readAt: null,
      createdAt: new Date().toISOString(),
      local: "sending",
    };
    setMessages((current) => mergeMessages(current, [local]));
    setDraft("");
    if (typingStop.current) clearTimeout(typingStop.current);
    typingSent.current = 0;
    void post(local);
  };

  const retry = (m: ChatMessage) => {
    const again = { ...m, local: "sending" as const };
    setMessages((current) => current.map((x) => (x.clientId === m.clientId ? again : x)));
    void post(again);
  };

  const onType = (text: string) => {
    setDraft(text);
    if (!text.trim()) return;
    const now = Date.now();
    if (now - typingSent.current > 3000) {
      typingSent.current = now;
      void api(`/api/conversations/${id}/typing`, { method: "POST", body: { typing: true } }).catch(() => undefined);
    }
    if (typingStop.current) clearTimeout(typingStop.current);
    typingStop.current = setTimeout(() => {
      typingSent.current = 0;
      void api(`/api/conversations/${id}/typing`, { method: "POST", body: { typing: false } }).catch(() => undefined);
    }, 4000);
  };

  const loadOlder = async () => {
    const first = messages.find((m) => !m.local);
    if (!first) return;
    const page = await api<{ messages: ServerMessage[]; hasMore: boolean }>(`/api/conversations/${id}/messages?before=${first.seq}`).catch(() => null);
    if (!page) return;
    setMessages((current) => mergeMessages(current, page.messages));
    setHasMore(page.hasMore);
  };

  const other = conversation?.otherUser;
  const status = typing ? t("messages.typing") : (presenceLabel(presence) ?? (other ? `@${other.username}` : ""));
  const lastMine = [...messages].reverse().find((m) => m.senderId === myId && !m.local);
  const ordered = [...messages].reverse(); // the list is inverted: newest at the bottom, where the thumb is

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={insets.top + 44}>
      <Stack.Screen
        options={{
          headerTitle: () =>
            other ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }} accessible accessibilityLabel={`${other.displayName}, ${status}`}>
                <PresenceAvatar src={other.avatarUrl} name={other.displayName} presence={presence} size={32} />
                <View>
                  <Txt style={{ fontWeight: "700" }}>{other.displayName}</Txt>
                  <Txt variant="caption" tone={typing ? "accent" : "secondary"}>
                    {status}
                  </Txt>
                </View>
              </View>
            ) : null,
        }}
      />
      {loading ? (
        <View style={{ padding: space.lg, gap: space.md }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} shape="rect" height={40} />
          ))}
        </View>
      ) : error && messages.length === 0 ? (
        <EmptyState icon={<MessageCircle size={24} color={theme.accent} />} title={t("messages.error")} action={<Button label={t("common.retry")} variant="secondary" onPress={() => void load()} />} />
      ) : (
        <FlatList
          inverted
          data={ordered}
          keyExtractor={(m) => m.clientId ?? m.id}
          contentContainerStyle={{ padding: space.lg, gap: space.sm }}
          accessibilityLabel={other ? t("messages.title") : undefined}
          ListHeaderComponent={
            typing ? (
              <View style={{ alignSelf: "flex-start", backgroundColor: theme.surface2, borderRadius: radius.lg, paddingHorizontal: space.md, paddingVertical: space.sm }}>
                <Txt tone="secondary">{t("messages.typing")}</Txt>
              </View>
            ) : null
          }
          ListFooterComponent={hasMore ? <Button label={t("messages.loadOlder")} variant="ghost" size="sm" onPress={() => void loadOlder()} /> : null}
          ListEmptyComponent={other ? <EmptyState icon={<MessageCircle size={24} color={theme.accent} />} title={t("messages.startTitle")} description={t("messages.startBody", { username: other.username })} /> : null}
          renderItem={({ item: m }) => {
            const mine = m.senderId === myId;
            const receipt = receiptOf(m);
            const showStatus = mine && (m.local || m.id === lastMine?.id);
            return (
              <View style={{ alignItems: mine ? "flex-end" : "flex-start", gap: 2 }}>
                <Pressable
                  disabled={m.local !== "failed"}
                  onPress={() => withTap(() => retry(m))()}
                  accessibilityLabel={m.local === "failed" ? `${m.content}, ${t("messages.status.failed")}` : undefined}
                  style={{
                    maxWidth: "80%",
                    borderRadius: radius.lg,
                    paddingHorizontal: space.md,
                    paddingVertical: space.sm,
                    backgroundColor: mine ? theme.accent : theme.surface2,
                    borderWidth: m.local === "failed" ? 2 : 0,
                    borderColor: theme.danger,
                    opacity: m.local === "sending" ? 0.7 : 1,
                  }}
                >
                  {m.storyId && (
                    <Txt variant="caption" tone={mine ? "onAccent" : "secondary"}>
                      {t("messages.storyReply")}
                    </Txt>
                  )}
                  <Txt tone={mine ? "onAccent" : "text"}>{m.content}</Txt>
                  <Txt variant="caption" tone={mine ? "onAccent" : "muted"} style={{ alignSelf: "flex-end", opacity: 0.8 }}>
                    {time(m.createdAt)}
                  </Txt>
                </Pressable>
                {showStatus && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    {receipt === "sent" && <Check size={12} color={theme.textMuted} />}
                    {(receipt === "delivered" || receipt === "read") && <CheckCheck size={12} color={receipt === "read" ? theme.accent : theme.textMuted} />}
                    <Txt variant="caption" tone={receipt === "failed" ? "danger" : "muted"}>
                      {t(`messages.status.${receipt}`)}
                    </Txt>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: space.sm, padding: space.md, paddingBottom: insets.bottom + space.md, borderTopWidth: 1, borderTopColor: theme.borderDefault, backgroundColor: theme.surface0 }}>
        {conversation?.blockedByMe ? (
          <Txt tone="secondary" style={{ flex: 1 }}>
            {t("messages.blocked", { username: other?.username ?? "" })}
          </Txt>
        ) : (
          <>
            <TextInput
              value={draft}
              onChangeText={onType}
              placeholder={t("messages.placeholder")}
              placeholderTextColor={theme.textMuted}
              accessibilityLabel={t("messages.placeholder")}
              multiline
              maxLength={4000}
              style={{ flex: 1, maxHeight: 120, borderWidth: 1, borderColor: theme.borderDefault, backgroundColor: theme.surface1, color: theme.textPrimary, borderRadius: radius.lg, paddingHorizontal: space.md, paddingVertical: space.sm, fontSize: 16 }}
            />
            <IconButton label={t("messages.send")} icon={<Send size={18} color={theme.onAccent} />} variant="primary" disabled={!draft.trim()} onPress={() => withTap(send)()} />
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
