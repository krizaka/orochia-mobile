import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import EventSource from "react-native-sse";
import { Bell } from "lucide-react-native";
import { toast, useTheme } from "@krizaka/ui/native";
import { OROCHIA_URL } from "./config";
import { openPath } from "./links";
import { readToken } from "./session";
import type { NotificationItem } from "./types";

interface LiveState {
  unread: number;
  markSeen: () => void;
}

const LiveContext = createContext<LiveState>({ unread: 0, markSeen: () => undefined });

/** A notification that arrived while the app is open: a toast (the `Toaster` at the root), tap to open what it is about. */
export function showNotification(n: NotificationItem, icon?: React.ReactNode): void {
  toast(n.text, { id: n.id, icon, onPress: () => openPath(n.path) });
}

/**
 * The account's live stream while the app is in the foreground: the same Server-Sent Events as the web
 * (`/api/conversations/stream`, the native session as `Authorization: Bearer`). A new notification raises the badge on
 * the account tab and slides in as a toast; in the background, push takes over.
 */
export function LiveProvider({ signedIn, children }: { signedIn: boolean; children: React.ReactNode }) {
  const [unread, setUnread] = useState(0);
  const { theme } = useTheme();
  const accent = useRef(theme.accent);
  useEffect(() => {
    accent.current = theme.accent;
  }, [theme.accent]);
  const [active, setActive] = useState(AppState.currentState === "active");

  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => setActive(s === "active"));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!signedIn || !active) return;
    let source: EventSource | null = null;
    let closed = false;
    void readToken().then((token) => {
      if (closed || !token) return;
      source = new EventSource(`${OROCHIA_URL}/api/conversations/stream`, { headers: { Authorization: `Bearer ${token}` }, pollingInterval: 5000 });
      source.addEventListener("message", (e) => {
        try {
          const event = JSON.parse(e.data ?? "") as { type?: string; notification?: NotificationItem };
          if (event.type !== "notification" || !event.notification) return;
          const n = event.notification;
          setUnread((u) => u + 1);
          showNotification(n, <Bell size={16} color={accent.current} />);
        } catch {
          // heartbeat or malformed
        }
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
  const value = useMemo(() => ({ unread: signedIn ? unread : 0, markSeen }), [signedIn, unread, markSeen]);
  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export function useLive(): LiveState {
  return useContext(LiveContext);
}
