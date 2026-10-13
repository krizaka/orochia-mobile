import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import EventSource from "react-native-sse";
import { Bell, MessageCircle } from "lucide-react-native";
import { toast, useTheme } from "@krizaka/ui/native";
import { api } from "./api";
import { OROCHIA_URL } from "./config";
import { openPath } from "./links";
import { readToken } from "./session";
import type { NotificationItem } from "./types";

/** An event of the account's stream (docs/NOTIFICATIONS.md §5 in krizaka/orochia): `type` and its fields. */
export type LiveEvent = { type?: string; [key: string]: unknown };
type Listener = (event: LiveEvent) => void;

interface LiveState {
  /** Notifications that arrived since the account screen was last seen (the account tab's badge). */
  unread: number;
  markSeen: () => void;
  /** Unread private messages, all conversations (the Messages tab's badge), kept by the stream. */
  messagesUnread: number;
  /** Listens to every event of the stream; returns the unsubscribe function. */
  subscribe: (listener: Listener) => () => void;
}

const LiveContext = createContext<LiveState>({ unread: 0, markSeen: () => undefined, messagesUnread: 0, subscribe: () => () => undefined });

/** A notification that arrived while the app is open: a toast (the `Toaster` at the root), tap to open what it is about. */
export function showNotification(n: NotificationItem, icon?: React.ReactNode): void {
  toast(n.text, { id: n.id, icon, onPress: () => openPath(n.path) });
}

type LiveMessage = { conversationId: string; content: string; isRead?: boolean; readAt?: string | null };

/**
 * Whether a message heard on the stream deserves a toast: not when Messages or its conversation is on screen (it
 * arrives in place), and not when it was already read — a reconnection replays the messages since the cursor, read
 * ones included, and they must not pop up again.
 */
export function toastsMessage(message: LiveMessage, screen: { onMessagesTab: boolean; viewing: string | null }): boolean {
  if (message.isRead || message.readAt) return false;
  return !screen.onMessagesTab && screen.viewing !== message.conversationId;
}

/** The conversation on screen (its messages arrive in place: no toast for them). */
let viewing: string | null = null;
export function setViewingConversation(id: string | null) {
  viewing = id;
}
/** Whether the Messages tab is on screen (no toast for any message then). */
let onMessagesTab = false;
export function setOnMessagesTab(value: boolean) {
  onMessagesTab = value;
}

/**
 * The account's live stream while the app is in the foreground: the same Server-Sent Events as the web
 * (`/api/conversations/stream`, the native session as `Authorization: Bearer`). One connection for the whole app —
 * notifications (toast + the account badge), the Messages badge, and every screen that `subscribe`s (Messages).
 * Coming back to the foreground reopens it with `?after=<last message>`: what arrived meanwhile is replayed; in the
 * background the server sees the app leave (presence) and push takes over.
 */
export function LiveProvider({ signedIn, children }: { signedIn: boolean; children: React.ReactNode }) {
  const [unread, setUnread] = useState(0);
  const [messagesUnread, setMessagesUnread] = useState(0);
  const { theme } = useTheme();
  const accent = useRef(theme.accent);
  useEffect(() => {
    accent.current = theme.accent;
  }, [theme.accent]);
  const [active, setActive] = useState(AppState.currentState === "active");
  const listeners = useRef(new Set<Listener>());
  const lastSeq = useRef<number | null>(null);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => setActive(s === "active"));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!signedIn) {
      lastSeq.current = null;
      return;
    }
    if (!active) return;
    let source: EventSource<"connected"> | null = null;
    let closed = false;
    const emit = (event: LiveEvent) => listeners.current.forEach((l) => l(event));
    void api<{ total: number }>("/api/conversations/unread")
      .then((r) => !closed && setMessagesUnread(r.total))
      .catch(() => undefined);
    void readToken().then((token) => {
      if (closed || !token) return;
      const after = lastSeq.current !== null ? `?after=${lastSeq.current}` : "";
      source = new EventSource<"connected">(`${OROCHIA_URL}/api/conversations/stream${after}`, { headers: { Authorization: `Bearer ${token}` }, pollingInterval: 5000 });
      source.addEventListener("connected", (e) => {
        try {
          emit({ type: "connected", ...(JSON.parse(e.data ?? "{}") as object), reconnect: true });
        } catch {
          // malformed
        }
      });
      source.addEventListener("message", (e) => {
        const seq = /^m(\d+)$/.exec(e.lastEventId ?? "")?.[1];
        if (seq) lastSeq.current = Math.max(lastSeq.current ?? 0, Number(seq));
        let event: LiveEvent;
        try {
          event = JSON.parse(e.data ?? "") as LiveEvent;
        } catch {
          return; // heartbeat or malformed
        }
        emit(event);
        if (event.type === "unread" && typeof event.total === "number") setMessagesUnread(event.total);
        if (event.type === "new_message") {
          const message = event.message as LiveMessage | undefined;
          if (message && toastsMessage(message, { onMessagesTab, viewing })) {
            toast(message.content, { id: `m-${message.conversationId}`, icon: <MessageCircle size={16} color={accent.current} />, onPress: () => openPath(`/messages?c=${message.conversationId}`) });
          }
        }
        if (event.type !== "notification" || !event.notification) return;
        const n = event.notification as NotificationItem;
        // Messages have their own toast (above) and badge.
        if ((n as { event?: string }).event === "newMessage") return;
        setUnread((u) => u + 1);
        showNotification(n, <Bell size={16} color={accent.current} />);
      });
    });
    return () => {
      closed = true;
      source?.removeAllEventListeners();
      source?.close();
    };
  }, [signedIn, active]);

  useEffect(() => {
    if (!signedIn) toast.dismiss();
  }, [signedIn]);

  const markSeen = useCallback(() => setUnread(0), []);
  const subscribe = useCallback((listener: Listener) => {
    listeners.current.add(listener);
    return () => void listeners.current.delete(listener);
  }, []);
  const value = useMemo(
    () => ({ unread: signedIn ? unread : 0, markSeen, messagesUnread: signedIn ? messagesUnread : 0, subscribe }),
    [signedIn, unread, markSeen, messagesUnread, subscribe],
  );
  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export function useLive(): LiveState {
  return useContext(LiveContext);
}

/** Calls `handler` for each event of the account's stream while the component is mounted. */
export function useLiveEvents(handler: Listener) {
  const { subscribe } = useLive();
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => subscribe((event) => ref.current(event)), [subscribe]);
}
