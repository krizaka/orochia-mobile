import React, { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Bell, X } from "lucide-react-native";
import { t } from "@/i18n";
import { openPath } from "@/lib/links";
import { useLive } from "@/lib/live";
import { radius, space, useTheme } from "@/lib/theme";
import type { NotificationItem } from "@/lib/types";
import { Txt } from "./ui";

const TOAST_MS = 6000;

function Toast({ n }: { n: NotificationItem }) {
  const { c } = useTheme();
  const { dismiss } = useLive();
  useEffect(() => {
    const timer = setTimeout(() => dismiss(n.id), TOAST_MS);
    return () => clearTimeout(timer);
  }, [n.id, dismiss]);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        dismiss(n.id);
        openPath(n.path);
      }}
      style={[styles.toast, { backgroundColor: c.surfaceElevated, borderColor: c.border }]}
    >
      <View style={[styles.icon, { backgroundColor: c.accentStrong }]}>
        <Bell size={14} color={c.onAccent} />
      </View>
      <Txt variant="caption" style={{ flex: 1 }} numberOfLines={3}>
        {n.text}
      </Txt>
      <Pressable accessibilityRole="button" accessibilityLabel={t("common.close")} hitSlop={10} onPress={() => dismiss(n.id)}>
        <X size={16} color={c.textTertiary} />
      </Pressable>
    </Pressable>
  );
}

/** What just happened, while the app is open: a notification from the live stream, tap to open it. */
export function LiveToast() {
  const insets = useSafeAreaInsets();
  const { fresh } = useLive();
  if (fresh.length === 0) return null;
  return (
    <View pointerEvents="box-none" style={[styles.stack, { top: insets.top + space.sm }]}>
      {fresh.map((n) => (
        <Toast key={n.id} n={n} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { position: "absolute", left: space.md, right: space.md, gap: space.sm, zIndex: 100 },
  toast: { flexDirection: "row", alignItems: "center", gap: space.sm, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: space.md, shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  icon: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
});
