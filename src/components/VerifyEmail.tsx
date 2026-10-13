import React, { useCallback, useEffect, useState } from "react";
import { AppState, View } from "react-native";
import { MailCheck } from "lucide-react-native";
import { Button, Txt, useTheme } from "@krizaka/ui/native";
import { BusyMark } from "@/components/BusyMark";
import { OrochiaMark } from "@/components/OrochiaMark";
import { t } from "@/i18n";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { errorText } from "@/lib/errors";
import { withTap } from "@/lib/haptics";
import { space } from "@/lib/theme";

/**
 * The verification step: the account exists and is signed in, but can do nothing until the address is confirmed with the
 * link e-mailed by the server (opened anywhere — the phone's mail, a computer). The app checks again when it comes back
 * to the foreground and on "I've confirmed it"; the link can be sent again. In a demo deployment only, the server also
 * answers the link, and a test build confirms it in place.
 */
export function VerifyEmail({ onVerified }: { onVerified?: () => void }) {
  const { theme } = useTheme();
  const { pending, devVerificationUrl, checkVerified, resendVerification, signOut } = useAuth();
  const [busy, setBusy] = useState<"check" | "resend" | "demo" | null>(null);
  const [note, setNote] = useState<{ tone: "secondary" | "success" | "danger"; text: string } | null>(null);

  const check = useCallback(
    async (quiet = false) => {
      if (!quiet) setBusy("check");
      try {
        if (await checkVerified()) return onVerified?.();
        if (!quiet) setNote({ tone: "secondary", text: t("verify.notYet") });
      } finally {
        if (!quiet) setBusy(null);
      }
    },
    [checkVerified, onVerified],
  );

  // Back from the mail app: maybe the link was opened.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void check(true);
    });
    return () => sub.remove();
  }, [check]);

  const resend = async () => {
    setBusy("resend");
    try {
      await resendVerification();
      setNote({ tone: "success", text: t("verify.sent") });
    } catch (e) {
      setNote({ tone: "danger", text: errorText(e) });
    } finally {
      setBusy(null);
    }
  };

  const confirmDemo = async () => {
    if (!devVerificationUrl) return;
    setBusy("demo");
    try {
      const token = new URL(devVerificationUrl).searchParams.get("token") ?? "";
      await api("/api/auth/verify-email", { method: "POST", body: { token } });
      await check(true);
    } catch (e) {
      setNote({ tone: "danger", text: errorText(e) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ gap: space.md }}>
      <View style={{ alignItems: "center", gap: space.md, marginBottom: space.md }}>
        <OrochiaMark size={72} title={t("app.name")} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <MailCheck size={14} color={theme.accent} />
          <Txt variant="caption" tone="accent" style={{ fontWeight: "800" }}>
            {t("verify.badge")}
          </Txt>
        </View>
        <Txt variant="display" style={{ textAlign: "center" }}>
          {t("verify.title")}
        </Txt>
        <Txt tone="secondary" style={{ textAlign: "center" }}>
          {t("verify.body", { email: pending?.email ?? "" })}
        </Txt>
      </View>
      {(busy === "check" || busy === "demo") && <BusyMark label={t("verify.checking")} />}
      {note && (
        <Txt tone={note.tone} style={{ textAlign: "center" }} accessibilityLiveRegion="polite">
          {note.text}
        </Txt>
      )}
      <Button label={t("verify.check")} variant="primary" size="lg" onPress={withTap(() => void check())} loading={busy === "check"} disabled={busy !== null} />
      <Button label={t("verify.resend")} variant="secondary" size="lg" onPress={withTap(() => void resend())} loading={busy === "resend"} disabled={busy !== null} />
      {devVerificationUrl && (
        <Button label={t("verify.demo")} variant="outline" size="lg" onPress={withTap(() => void confirmDemo())} loading={busy === "demo"} disabled={busy !== null} />
      )}
      <Button label={t("verify.otherAccount")} variant="ghost" size="md" onPress={withTap(() => void signOut())} disabled={busy !== null} />
    </View>
  );
}
