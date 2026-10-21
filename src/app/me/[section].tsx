import React from "react";
import { ScrollView, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { ExternalLink } from "lucide-react-native";
import { Button, EmptyState, Txt, useTheme } from "@krizaka/ui/native";
import { EarningsCard } from "@/components/EarningsCard";
import { t, type MessageKey } from "@/i18n";
import { orochiaWebUrl } from "@/lib/config";
import { withTap } from "@/lib/haptics";
import { space } from "@/lib/theme";

const SECTIONS = ["videos", "library", "collections", "lists", "network", "invitations", "insights", "transactions", "earnings", "treasury", "settings"] as const;

/**
 * A section of the private space (`/me/<section>`, the same addresses as the web's): earnings and the notification
 * settings are native; the others open their web page, which is the same view — so a shared or pushed link always lands
 * on the right screen of the app.
 */
export default function SpaceSection() {
  const { section } = useLocalSearchParams<{ section: string }>();
  const { theme } = useTheme();
  const known = (SECTIONS as readonly string[]).includes(section);
  const title = known ? t(`space.sections.${section}` as MessageKey) : "";
  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }}>
      <Stack.Screen options={{ title }} />
      {!known ? (
        <EmptyState title={t("errors.generic")} />
      ) : section === "earnings" ? (
        <EarningsCard />
      ) : (
        <View style={{ gap: space.md }}>
          <Txt variant="title">{title}</Txt>
          {section === "settings" && <Button label={t("space.settings")} variant="secondary" size="lg" onPress={withTap(() => router.push("/settings/notifications"))} />}
          <Button label={t("space.openWeb")} variant="secondary" size="lg" icon={<ExternalLink size={14} color={theme.textPrimary} />} onPress={withTap(() => void WebBrowser.openBrowserAsync(`${orochiaWebUrl()}/me/${section}`))} />
        </View>
      )}
    </ScrollView>
  );
}
