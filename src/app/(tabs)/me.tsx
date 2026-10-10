import React, { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { Bell, ExternalLink, LogOut, Wallet as WalletIcon } from "lucide-react-native";
import { Avatar, Button, Card, Txt, useTheme } from "@krizaka/ui/native";
import { OrochiaMark } from "@/components/OrochiaMark";
import { t, usd } from "@/i18n";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { openPath } from "@/lib/links";
import { useLive } from "@/lib/live";
import { OROCHIA_URL, absoluteUrl } from "@/lib/config";
import { withTap } from "@/lib/haptics";
import { useApi } from "@/lib/useApi";
import { space } from "@/lib/theme";
import type { NotificationItem, Wallet } from "@/lib/types";

function SignIn() {
  const { theme, radius } = useTheme();
  const { signIn } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const field = { borderWidth: 1, borderColor: theme.borderDefault, backgroundColor: theme.surface1, color: theme.textPrimary, borderRadius: radius.md, padding: space.md, fontSize: 16 };
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
        placeholderTextColor={theme.textMuted}
        autoCapitalize="none"
        autoComplete="username"
        textContentType="username"
        style={field}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder={t("me.password")}
        placeholderTextColor={theme.textMuted}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        onSubmitEditing={() => void submit()}
        style={field}
      />
      {error && <Txt tone="danger">{error}</Txt>}
      <Button label={t("me.signIn")} variant="primary" size="lg" onPress={withTap(() => void submit())} loading={busy} disabled={!identifier || !password} />
      <Button label={t("me.noAccount")} variant="secondary" size="lg" onPress={withTap(() => void WebBrowser.openBrowserAsync(`${OROCHIA_URL}/auth/register`))} />
    </View>
  );
}

function Account() {
  const { theme } = useTheme();
  const { user, signOut } = useAuth();
  const wallet = useApi<Wallet>("/api/me/wallet");
  const notes = useApi<{ items: NotificationItem[] }>("/api/me/notifications");
  const { markSeen } = useLive();
  useEffect(markSeen, [markSeen]);
  const open = openPath;
  return (
    <ScrollView
      contentContainerStyle={{ gap: space.lg }}
      refreshControl={<RefreshControl refreshing={wallet.refreshing} onRefresh={() => void Promise.all([wallet.refresh(), notes.refresh()])} tintColor={theme.accent} />}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
        <Avatar src={absoluteUrl(user?.avatarUrl)} alt={user?.displayName || user?.username} size="lg" />
        <View style={{ flex: 1 }}>
          <Txt variant="title">{user?.displayName || user?.username}</Txt>
          <Txt tone="secondary">@{user?.username}</Txt>
        </View>
      </View>

      <Card.Root>
        <Card.Body style={{ gap: space.sm }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <WalletIcon size={16} color={theme.accent} />
          <Txt variant="label">{t("me.wallet")}</Txt>
        </View>
        <Txt variant="display">{usd(wallet.data?.balanceCents ?? 0)}</Txt>
        {(wallet.data?.heldCents ?? 0) > 0 && (
          <Txt variant="caption" tone="secondary">
            {t("me.held", { amount: usd(wallet.data?.heldCents ?? 0) })}
          </Txt>
        )}
        <Button label={t("me.topUp")} variant="secondary" size="lg" icon={<ExternalLink size={14} color={theme.textPrimary} />} onPress={withTap(() => void WebBrowser.openBrowserAsync(`${OROCHIA_URL}/wallet`))} />
        </Card.Body>
      </Card.Root>

      <Card.Root>
        <Card.Body>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Bell size={16} color={theme.accent} />
          <Txt variant="label">{t("me.notifications")}</Txt>
        </View>
        {(notes.data?.items ?? []).length === 0 ? (
          <Txt tone="secondary">{t("me.noNotifications")}</Txt>
        ) : (
          (notes.data?.items ?? []).slice(0, 15).map((n) => (
            <Txt key={n.id} tone={n.readAt ? "secondary" : "text"} onPress={() => open(n.path)} role="link">
              {n.text}
            </Txt>
          ))
        )}
        </Card.Body>
      </Card.Root>

      <Button label={t("me.profile")} variant="secondary" size="lg" icon={<ExternalLink size={14} color={theme.textPrimary} />} onPress={withTap(() => void WebBrowser.openBrowserAsync(`${OROCHIA_URL}/@${user?.username}`))} />
      <Button label={t("me.signOut")} variant="secondary" size="lg" icon={<LogOut size={14} color={theme.textPrimary} />} onPress={withTap(() => void signOut())} />
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
