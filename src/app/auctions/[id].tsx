import React, { useCallback, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { Gavel, Trophy } from "lucide-react-native";
import { Avatar, Button, Card, Countdown, Skeleton, Txt, useTheme } from "@krizaka/ui/native";
import { AmountPicker } from "@/components/AmountPicker";
import { t, usd } from "@/i18n";
import { api } from "@/lib/api";
import { absoluteUrl } from "@/lib/config";
import { countdownUnits, useClockSkew } from "@/lib/countdown";
import { errorText } from "@/lib/errors";
import { usePolling } from "@/lib/usePolling";
import { useApi } from "@/lib/useApi";
import { withTap } from "@/lib/haptics";
import { space } from "@/lib/theme";
import type { AuctionView } from "@/lib/types";

/** An auction: the price, the clock (aligned on the server's), bids by alias, and bidding in credits. */
export default function Auction() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const view = useApi<{ auction: AuctionView }>(`/api/auctions/${id}`);
  const skewMs = useClockSkew(view.data?.auction.serverNow);
  const a = view.data?.auction;
  const [amount, setAmount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { reload } = view;
  const tick = useCallback(() => void reload(), [reload]);
  usePolling(tick, 4000, a?.phase === "OPEN");

  if (!a) return <View style={{ padding: space.lg }}>{view.loading ? <Skeleton shape="rect" height={320} /> : <Txt>{t("errors.generic")}</Txt>}</View>;
  const chosen = amount && amount >= a.minimumNextBidCents ? amount : a.minimumNextBidCents;
  const bid = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await api(`/api/auctions/${id}/bids`, { method: "POST", body: { amountCents: chosen } });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      setMessage(t("auction.placed"));
      setAmount(null);
      await reload();
    } catch (e) {
      setMessage(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }} refreshControl={<RefreshControl refreshing={view.refreshing} onRefresh={() => void view.refresh()} tintColor={theme.accent} />}>
      <Card.Root radius="lg">
        <Card.Media>
          <Card.Image src={absoluteUrl(a.video.thumbnailUrl)} fallback={<Gavel size={32} color={theme.accent} />} />
        </Card.Media>
      </Card.Root>
      <Txt variant="caption" tone="accent" style={{ fontWeight: "800", letterSpacing: 1 }}>
        {t(`auction.phase.${a.phase as "OPEN"}`).toUpperCase()}
      </Txt>
      <Txt variant="display">{a.video.title}</Txt>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
        <Avatar src={absoluteUrl(a.creator.avatarUrl)} alt={a.creator.name} size={28} />
        <Txt tone="secondary">{a.creator.name}</Txt>
      </View>
      <Card.Root>
        <Card.Body style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
        <View>
          <Txt variant="caption" tone="muted">
            {t("auction.currentBid")}
          </Txt>
          <Txt variant="display">{usd(a.highestBidCents || a.minimumNextBidCents)}</Txt>
          <Txt variant="caption" tone="secondary">
            {t("auction.bids", { count: a.bidsCount })}
          </Txt>
        </View>
        {a.phase === "OPEN" && (
          <View style={{ alignItems: "flex-end", gap: 2 }}>
            <Txt variant="caption" tone="muted">
              {t("auction.endsIn")}
            </Txt>
            <Countdown target={a.endsAt} skewMs={skewMs} label={t("auction.endsIn")} units={countdownUnits()} size="md" urgentBelowMs={120_000} />
          </View>
        )}
        </Card.Body>
      </Card.Root>
      <Txt variant="caption" tone="secondary">
        {t(`auction.rights.${a.rights}`)}
      </Txt>
      {(a.viewer.isLeader || a.viewer.won) && (
        <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
          <Trophy size={14} color={theme.success} />
          <Txt tone="success">{a.viewer.won ? t("auction.won") : t("auction.leading")}</Txt>
        </View>
      )}
      {a.viewer.won && <Button label={t("challenge.watch")} variant="primary" size="lg" onPress={withTap(() => router.push(`/watch/${a.video.id}`))} />}
      {a.phase === "OPEN" && !a.viewer.isCreator && (
        a.viewer.signedIn ? (
          <Card.Root>
            <Card.Body>
            <AmountPicker amounts={a.suggestedBidsCents} value={chosen} onChange={setAmount} label={t("auction.amounts")} />
            <Button label={t("auction.bid", { amount: usd(chosen) })} variant="primary" size="lg" onPress={withTap(() => void bid())} loading={busy} />
            {a.viewer.balanceCents !== null && (
              <Txt variant="caption" tone="secondary">
                {t("challenge.balance", { amount: usd(a.viewer.balanceCents) })}
              </Txt>
            )}
            {message && <Txt variant="caption">{message}</Txt>}
            </Card.Body>
          </Card.Root>
        ) : (
          <Button label={t("challenge.signIn")} variant="secondary" size="lg" onPress={withTap(() => router.push("/me"))} />
        )
      )}
      {a.recentBids.length > 0 && (
        <Card.Root>
          <Card.Body style={{ gap: space.sm }}>
          {a.recentBids.map((b) => (
            <View key={b.id} style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Txt tone="secondary">{b.mine ? t("challenge.you") : t("auction.bidder", { n: b.alias })}</Txt>
              <Txt variant="mono">{usd(b.amountCents)}</Txt>
            </View>
          ))}
          </Card.Body>
        </Card.Root>
      )}
    </ScrollView>
  );
}
