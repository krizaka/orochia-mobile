import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import EventSource from "react-native-sse";
import { OROCHIA_URL } from "./config";
import { readToken } from "./session";
import type { NotificationItem } from "./types";

interface LiveState {
  unread: number;
  /** Notifications that arrived while the app was open — shown as a toast, then dismissed. */
  fresh: NotificationItem[];
  dismiss: (id: string) => void;
  markSeen: () => void;
}

const LiveContext = createContext<LiveState>({ unread: 0, fresh: [], dismiss: () => undefined, markSeen: () => undefined });

/**
 * The account's live stream while the app is in the foreground: the same Server-Sent Events as the web
 * (`/api/conversations/stream`, the native session as `Authorization: Bearer`). A new notification raises the badge on
 * the account tab and slides in as a toast; in the background, push takes over.
 */
export function LiveProvider({ signedIn, children }: { signedIn: boolean; children: React.ReactNode }) {
  const [unread, setUnread] = useState(0);
  const [fresh, setFresh] = useState<NotificationItem[]>([]);
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
          setFresh((all) => [n, ...all.filter((x) => x.id !== n.id)].slice(0, 2));
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

  const dismiss = useCallback((id: string) => setFresh((all) => all.filter((n) => n.id !== id)), []);
  const markSeen = useCallback(() => setUnread(0), []);
  const value = useMemo(() => ({ unread: signedIn ? unread : 0, fresh: signedIn ? fresh : [], dismiss, markSeen }), [signedIn, unread, fresh, dismiss, markSeen]);
  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export function useLive(): LiveState {
  return useContext(LiveContext);
}
