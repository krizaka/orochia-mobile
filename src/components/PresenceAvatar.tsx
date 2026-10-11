import React from "react";
import { View } from "react-native";
import { Avatar, useTheme } from "@krizaka/ui/native";
import { t } from "@/i18n";
import type { PresenceView } from "@/lib/chat";

/** "3 min ago", "2 h ago" — short, for "Seen …". */
export function ago(iso: string, now = Date.now()): string {
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  if (s < 60) return t("messages.ago.now");
  if (s < 3600) return t("messages.ago.minutes", { count: Math.round(s / 60) });
  if (s < 86400) return t("messages.ago.hours", { count: Math.round(s / 3600) });
  return t("messages.ago.days", { count: Math.round(s / 86400) });
}

/** "Online", "Away", "Seen 5 min ago" — or null when the presence is not shared. */
export function presenceLabel(view: PresenceView | undefined): string | null {
  if (!view) return null;
  if (view.state === "online") return t("messages.presence.online");
  if (view.state === "away") return t("messages.presence.away");
  return view.lastSeenAt ? t("messages.presence.seen", { when: ago(view.lastSeenAt) }) : null;
}

/**
 * An avatar with its presence: a green dot online, an amber ring away. The words are said by the caller
 * (`presenceLabel`, in the row's accessibility label). Local until @krizaka/ui's Avatar has a status (krizaka/krizaka-ui#74).
 */
export function PresenceAvatar({ src, name, presence, size = 44 }: { src: string | null; name: string; presence?: PresenceView; size?: number }) {
  const { theme } = useTheme();
  const state = presence?.state;
  const dot = Math.round(size * 0.28);
  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Avatar src={src} alt={name} size={size} />
      {(state === "online" || state === "away") && (
        <View
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            width: dot,
            height: dot,
            borderRadius: dot / 2,
            borderWidth: 2,
            borderColor: state === "online" ? theme.surface0 : theme.warning,
            backgroundColor: state === "online" ? theme.success : theme.surface0,
          }}
        />
      )}
    </View>
  );
}
