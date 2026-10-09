import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type TextProps, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { absoluteUrl } from "@/lib/config";
import { radius, space, useTheme } from "@/lib/theme";

type Variant = "display" | "title" | "body" | "caption" | "label" | "mono";

/** Text in the Orochia scale, coloured for the current theme. */
export function Txt({ variant = "body", tone = "text", style, ...rest }: TextProps & { variant?: Variant; tone?: "text" | "textSecondary" | "textTertiary" | "accent" | "success" | "danger" | "onAccent" }) {
  const { c } = useTheme();
  return <Text {...rest} style={[styles[variant], { color: c[tone] }, style]} />;
}

/** A surface card: the theme's raised background, a hairline border, rounded corners. */
export function Card({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  const { c } = useTheme();
  return <View style={[{ backgroundColor: c.surface, borderColor: c.border, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: space.lg }, style]}>{children}</View>;
}

/**
 * A button: `primary` carries the signature gradient, `secondary` is outlined. A light haptic confirms the press;
 * `loading` shows a spinner and blocks a second tap.
 */
export function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  icon,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { c, gradient } = useTheme();
  const inactive = disabled || loading;
  const press = () => {
    if (inactive) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    onPress();
  };
  const content = (
    <View style={styles.buttonRow}>
      {loading ? <ActivityIndicator color={variant === "primary" ? c.onAccent : c.text} /> : icon}
      <Txt variant="label" tone={variant === "primary" ? "onAccent" : "text"}>
        {label}
      </Txt>
    </View>
  );
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: inactive, busy: loading }} onPress={press} style={({ pressed }) => [{ opacity: inactive ? 0.5 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }, style]}>
      {variant === "primary" ? (
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.button}>
          {content}
        </LinearGradient>
      ) : (
        <View style={[styles.button, { borderColor: c.border, borderWidth: 1, backgroundColor: c.surface }]}>{content}</View>
      )}
    </Pressable>
  );
}

/** A pill to pick one value among a few (amounts, tabs). */
export function Chip({ label, active, onPress }: { label: string; active: boolean } & Pick<PressableProps, "onPress">) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.chip, { borderColor: active ? c.accentStrong : c.border, backgroundColor: active ? `${c.accentStrong}26` : "transparent" }]}
    >
      <Txt variant="label" tone={active ? "accent" : "textSecondary"}>
        {label}
      </Txt>
    </Pressable>
  );
}

/** A round picture; the platform's default artwork when there is none. */
export function Avatar({ uri, size = 32 }: { uri: string | null | undefined; size?: number }) {
  const { c } = useTheme();
  const source = absoluteUrl(uri) ?? absoluteUrl("/defaults/avatars/avatar-01.svg");
  return <Image source={source} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.surfaceElevated }} contentFit="cover" transition={150} />;
}

/** What an empty list says: an icon, a line, what to do next. */
export function Empty({ icon, title, body, action }: { icon: React.ReactNode; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <View style={styles.empty}>
      {icon}
      <Txt variant="title" style={{ textAlign: "center", marginTop: space.md }}>
        {title}
      </Txt>
      {body ? (
        <Txt tone="textSecondary" style={{ textAlign: "center", marginTop: space.xs }}>
          {body}
        </Txt>
      ) : null}
      {action ? <View style={{ marginTop: space.lg }}>{action}</View> : null}
    </View>
  );
}

/** A loading placeholder that keeps the layout: a soft block in the surface colour. */
export function Skeleton({ height, style }: { height: number; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return <View style={[{ height, borderRadius: radius.lg, backgroundColor: c.surface }, style]} />;
}

const styles = StyleSheet.create({
  display: { fontSize: 30, fontWeight: "900", letterSpacing: -0.5 },
  title: { fontSize: 18, fontWeight: "800" },
  body: { fontSize: 15, lineHeight: 21 },
  caption: { fontSize: 12, lineHeight: 16 },
  label: { fontSize: 14, fontWeight: "700" },
  mono: { fontSize: 14, fontVariant: ["tabular-nums"], fontWeight: "700" },
  button: { borderRadius: radius.lg, paddingVertical: 14, paddingHorizontal: space.xl, alignItems: "center", justifyContent: "center" },
  buttonRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  chip: { borderWidth: 1, borderRadius: radius.full, paddingVertical: 8, paddingHorizontal: 14 },
  empty: { alignItems: "center", paddingVertical: 48, paddingHorizontal: space.xl },
});
