import React, { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { Bell, ExternalLink, LogOut, Wallet as WalletIcon } from "lucide-react-native";
import { OrochiaMark } from "@/components/OrochiaMark";
import { Avatar, Button, Card, Txt } from "@/components/ui";
import { t, usd } from "@/i18n";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { openPath } from "@/lib/links";
import { useLive } from "@/lib/live";
import { OROCHIA_URL } from "@/lib/config";
import { useApi } from "@/lib/useApi";
import { radius, space, useTheme } from "@/lib/theme";
import type { NotificationItem, Wallet } from "@/lib/types";

function SignIn() {
  const { c } = useTheme();
  const { signIn } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const field = { borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, color: c.text, borderRadius: radius.md, padding: space.md, fontSize: 16 };
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await signIn(identifier.trim(), password);
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 0;
      const code = e instanceof ApiError ? e.body.code : null;
      setError(
        code === "EMAIL_NOT_VERIFIED" ? t("me.errors.unverified") : status === 401 ? t("me.errors.credentials") : status === 403 ? t("me.errors.suspended") : status === 429 ? t("me.errors.tooMany") : t("me.errors.network"),
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: space.md }}>
      <View style={{ alignItems: "center", gap: space.md, marginBottom: space.lg }}>
        <OrochiaMark size={72} title={t("app.name")} />
        <Txt variant="display">{t("me.signInTitle")}</Txt>
      </View>
      <TextInput
        value={identifier}
        onChangeText={setIdentifier}
        placeholder={t("me.identifier")}
        placeholderTextColor={c.textTertiary}
        autoCapitalize="none"
        autoComplete="username"
        textContentType="username"
        style={field}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder={t("me.password")}
        placeholderTextColor={c.textTertiary}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        onSubmitEditing={() => void submit()}
        style={field}
      />
      {error && <Txt tone="danger">{error}</Txt>}
      <Button label={t("me.signIn")} onPress={() => void submit()} loading={busy} disabled={!identifier || !password} />
      <Button label={t("me.noAccount")} variant="secondary" onPress={() => void WebBrowser.openBrowserAsync(`${OROCHIA_URL}/auth/register`)} />
    </View>
  );
}

function Account() {
  const { c } = useTheme();
  const { user, signOut } = useAuth();
  const wallet = useApi<Wallet>("/api/me/wallet");
  const notes = useApi<{ items: NotificationItem[] }>("/api/me/notifications");
  const { markSeen } = useLive();
  useEffect(markSeen, [markSeen]);
  const open = openPath;
  return (
    <ScrollView
      contentContainerStyle={{ gap: space.lg }}
      refreshControl={<RefreshControl refreshing={wallet.refreshing} onRefresh={() => void Promise.all([wallet.refresh(), notes.refresh()])} tintColor={c.accent} />}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
        <Avatar uri={user?.avatarUrl} size={56} />
        <View style={{ flex: 1 }}>
          <Txt variant="title">{user?.displayName || user?.username}</Txt>
          <Txt tone="textSecondary">@{user?.username}</Txt>
        </View>
      </View>

      <Card style={{ gap: space.sm }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <WalletIcon size={16} color={c.accent} />
          <Txt variant="label">{t("me.wallet")}</Txt>
        </View>
        <Txt variant="display">{usd(wallet.data?.balanceCents ?? 0)}</Txt>
        {(wallet.data?.heldCents ?? 0) > 0 && (
          <Txt variant="caption" tone="textSecondary">
            {t("me.held", { amount: usd(wallet.data?.heldCents ?? 0) })}
          </Txt>
        )}
        <Button label={t("me.topUp")} variant="secondary" icon={<ExternalLink size={14} color={c.text} />} onPress={() => void WebBrowser.openBrowserAsync(`${OROCHIA_URL}/wallet`)} />
      </Card>

      <Card style={{ gap: space.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Bell size={16} color={c.accent} />
          <Txt variant="label">{t("me.notifications")}</Txt>
        </View>
        {(notes.data?.items ?? []).length === 0 ? (
          <Txt tone="textSecondary">{t("me.noNotifications")}</Txt>
        ) : (
          (notes.data?.items ?? []).slice(0, 15).map((n) => (
            <Txt key={n.id} tone={n.readAt ? "textSecondary" : "text"} onPress={() => open(n.path)} accessibilityRole="link">
              {n.text}
            </Txt>
          ))
        )}
      </Card>

      <Button label={t("me.profile")} variant="secondary" icon={<ExternalLink size={14} color={c.text} />} onPress={() => void WebBrowser.openBrowserAsync(`${OROCHIA_URL}/@${user?.username}`)} />
      <Button label={t("me.signOut")} variant="secondary" icon={<LogOut size={14} color={c.text} />} onPress={() => void signOut()} />
    </ScrollView>
  );
}

/** The account tab: sign in (a native session in secure storage), then the wallet, notifications and sign out. */
export default function Me() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingTop: insets.top + space.lg, paddingHorizontal: space.lg }}>{user ? <Account /> : <SignIn />}</View>
    </KeyboardAvoidingView>
  );
}
