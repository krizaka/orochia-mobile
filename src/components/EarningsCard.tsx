import React from "react";
import { View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { BarChart, Gauge, Sparkline } from "@krizaka/charts/native";
import { Button, Card, Skeleton, Txt, useTheme } from "@krizaka/ui/native";
import { ExternalLink, Landmark } from "lucide-react-native";
import { t, usd } from "@/i18n";
import { OROCHIA_URL } from "@/lib/config";
import { withTap } from "@/lib/haptics";
import { space } from "@/lib/theme";
import type { CreatorEarnings } from "@/lib/types";
import { useApi } from "@/lib/useApi";

const USD = { style: "money", currency: "USD" } as const;

/**
 * A creator's earnings on the phone, read from the same ledger endpoint as the web's Earnings page: the net of the last
 * 30 days with the pulse of the tips, the last six months, and the next payout against its minimum. Withdrawing stays
 * on the web.
 */
export function EarningsCard() {
  const { theme } = useTheme();
  const { data, loading } = useApi<CreatorEarnings>("/api/creator/earnings?period=30d");
  if (loading && !data) {
    return (
      <Card.Root>
        <Card.Body style={{ gap: space.sm }}>
          <Skeleton width="40%" height={14} />
          <Skeleton width="60%" height={28} />
          <Skeleton height={120} />
        </Card.Body>
      </Card.Root>
    );
  }
  if (!data) return null;
  const s = data.summary;
  const minimum = s.payoutMinimumCents ?? 2000;
  const months = data.monthly.slice(-6);
  return (
    <Card.Root>
      <Card.Body style={{ gap: space.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Landmark size={16} color={theme.accent} />
          <Txt variant="label">{t("earnings.title")}</Txt>
        </View>
        <View>
          <Txt variant="display">{usd(s.netCents)}</Txt>
          <Txt variant="caption" tone="secondary">
            {t("earnings.net", { fee: s.feePercent, payments: s.payments })}
          </Txt>
        </View>
        {(data.tips ?? []).some((d) => d.netCents > 0) && (
          <Sparkline title={t("earnings.tips")} data={data.tips!.map((d) => d.netCents)} categories={data.tips!.map((d) => d.day)} variant="area" format={USD} height={36} />
        )}
        <BarChart title={t("earnings.months")} data={months} x="month" xFormat="month" y="netCents" yLabel={t("earnings.share")} format={USD} height={160} />
        <Gauge
          title={t("earnings.payout")}
          value={s.availableCents}
          max={Math.max(minimum, s.availableCents)}
          format={USD}
          caption={t("earnings.available")}
          target={{ value: minimum, label: t("earnings.minimum"), tone: "success" }}
          tone={s.availableCents >= minimum ? "success" : "accent"}
          height={150}
        />
        <Txt variant="caption" tone="secondary">
          {s.availableCents >= minimum ? t("earnings.ready") : t("earnings.toGo", { amount: usd(minimum - s.availableCents) })}
        </Txt>
        <Button label={t("earnings.open")} variant="secondary" size="lg" icon={<ExternalLink size={14} color={theme.textPrimary} />} onPress={withTap(() => void WebBrowser.openBrowserAsync(`${OROCHIA_URL}/earnings`))} />
      </Card.Body>
    </Card.Root>
  );
}
