import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import EventSource from "react-native-sse";
import { orochiaUrl } from "./config";

/** An event of an auction's or a challenge's live feed (docs/REALTIME.md in krizaka/orochia): `type` and its fields. */
export type TopicEvent = { type?: string; [key: string]: unknown };

/**
 * The live feed of one auction or challenge (`/api/auctions/:id/stream`, `/api/challenges/:id/stream` — public, the
 * same Server-Sent Events as the web), open while the screen is shown and the app is in front. Every event is handed
 * over, `connected` too: it comes again after each reconnection, and the screen reloads then to catch up on what it
 * missed while away (the feed carries no history). `path` null: nothing is opened (closed auction, still loading).
 */
export function useLiveTopic(path: string | null, onEvent: (event: TopicEvent) => void) {
  const handler = useRef(onEvent);
  useEffect(() => {
    handler.current = onEvent;
  });
  const [active, setActive] = useState(AppState.currentState === "active");
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => setActive(state === "active"));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!path || !active) return;
    const source = new EventSource<"connected">(`${orochiaUrl()}${path}`, { pollingInterval: 3000 });
    const parse = (data: string | null | undefined): TopicEvent | null => {
      try {
        const event = JSON.parse(data ?? "") as unknown;
        return event && typeof event === "object" ? (event as TopicEvent) : null;
      } catch {
        return null; // a heartbeat, or not ours
      }
    };
    source.addEventListener("connected", (e) => handler.current({ ...(parse(e.data) ?? {}), type: "connected" }));
    source.addEventListener("message", (e) => {
      const event = parse(e.data);
      if (event) handler.current(event);
    });
    return () => {
      source.removeAllEventListeners();
      source.close();
    };
  }, [path, active]);
}
