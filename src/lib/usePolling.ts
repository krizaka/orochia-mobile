import { useEffect } from "react";
import { AppState } from "react-native";

/**
 * Calls `tick` every `ms` while the app is in the foreground — how a detail screen stays current (the web app's
 * Server-Sent Events need an EventSource, which React Native does not have).
 */
export function usePolling(tick: () => void, ms: number, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setInterval> | null = setInterval(tick, ms);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && !timer) {
        tick();
        timer = setInterval(tick, ms);
      } else if (state !== "active" && timer) {
        clearInterval(timer);
        timer = null;
      }
    });
    return () => {
      if (timer) clearInterval(timer);
      sub.remove();
    };
  }, [tick, ms, enabled]);
}
