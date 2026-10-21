import React, { useState } from "react";
import { View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { Txt, useTheme } from "@krizaka/ui/native";
import { t } from "@/i18n";
import { orochiaWebUrl } from "@/lib/config";
import { space } from "@/lib/theme";

/**
 * The server's bot challenge (Cloudflare Turnstile) when it asks for one at sign-up. Turnstile has no native SDK: the
 * server serves the widget at `/auth/native-challenge` (the same site key and the same server check as the web form,
 * failing closed) and this WebView carries the token back. Invisible unless Cloudflare really doubts — then the check
 * appears here. A token is good for one submission: the form remounts this (`key`) after a refusal.
 */
export function BotChallenge({ onToken }: { onToken: (token: string | null) => void }) {
  const { theme, scheme } = useTheme();
  const [interactive, setInteractive] = useState(false);
  const onMessage = (event: WebViewMessageEvent) => {
    let message: { type?: string; token?: string | null; interactive?: boolean; off?: boolean };
    try {
      message = JSON.parse(event.nativeEvent.data) as typeof message;
    } catch {
      return;
    }
    if (message.type !== "challenge") return;
    if (typeof message.interactive === "boolean") setInteractive(message.interactive);
    if ("token" in message) onToken(typeof message.token === "string" ? message.token : null);
  };
  return (
    <View style={{ gap: space.xs }}>
      {interactive && (
        <Txt variant="caption" tone="secondary">
          {t("signUp.challenge")}
        </Txt>
      )}
      <WebView
        testID="bot-challenge"
        source={{ uri: `${orochiaWebUrl()}/auth/native-challenge?theme=${scheme === "light" ? "light" : "dark"}` }}
        onMessage={onMessage}
        onError={() => onToken(null)}
        originWhitelist={[orochiaWebUrl(), "https://challenges.cloudflare.com"]}
        style={{ height: interactive ? 72 : 1, backgroundColor: theme.surface0 }}
        scrollEnabled={false}
        javaScriptEnabled
      />
    </View>
  );
}
