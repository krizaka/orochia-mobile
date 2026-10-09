import React, { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { Trophy } from "lucide-react-native";
import { AmountPicker } from "@/components/AmountPicker";
import { Countdown } from "@/components/Countdown";
import { Avatar, Button, Card, Skeleton, Txt } from "@/components/ui";
import { t, usd } from "@/i18n";
import { api } from "@/lib/api";
import { absoluteUrl } from "@/lib/config";
import { errorText } from "@/lib/errors";
import { usePolling } from "@/lib/usePolling";
import { useApi } from "@/lib/useApi";
import { radius, space, useTheme } from "@/lib/theme";
import type { AuctionView } from "@/lib/types";

/** An auction: the price, the clock (aligned on the server's), bids by alias, and bidding in credits. */
export default function Auction() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const view = useApi<{ auction: AuctionView }>(`/api/auctions/${id}`);
  const a = view.data?.auction;
  const [amount, setAmount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { reload } = view;
  const tick = useCallback(() => void reload(), [reload]);
  usePolling(tick, 4000, a?.phase === "OPEN");

  if (!a) return <View style={{ padding: space.lg }}>{view.loading ? <Skeleton height={320} /> : <Txt>{t("errors.generic")}</Txt>}</View>;
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
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }} refreshControl={<RefreshControl refreshing={view.refreshing} onRefresh={() => void view.refresh()} tintColor={c.accent} />}>
      <View style={[styles.thumb, { backgroundColor: c.surfaceElevated }]}>
        <Image source={absoluteUrl(a.video.thumbnailUrl)} style={StyleSheet.absoluteFill} contentFit="cover" />
      </View>
      <Txt variant="caption" tone="accent" style={{ fontWeight: "800", letterSpacing: 1 }}>
        {t(`auction.phase.${a.phase as "OPEN"}`).toUpperCase()}
      </Txt>
      <Txt variant="display">{a.video.title}</Txt>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
        <Avatar uri={a.creator.avatarUrl} size={28} />
        <Txt tone="textSecondary">{a.creator.name}</Txt>
      </View>
      <Card style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
        <View>
          <Txt variant="caption" tone="textTertiary">
            {t("auction.currentBid")}
          </Txt>
          <Txt variant="display">{usd(a.highestBidCents || a.minimumNextBidCents)}</Txt>
          <Txt variant="caption" tone="textSecondary">
            {t("auction.bids", { count: a.bidsCount })}
          </Txt>
        </View>
        {a.phase === "OPEN" && <Countdown target={a.endsAt} serverNow={a.serverNow} label={t("auction.endsIn")} size="lg" />}
      </Card>
      <Txt variant="caption" tone="textSecondary">
        {t(`auction.rights.${a.rights}`)}
      </Txt>
      {(a.viewer.isLeader || a.viewer.won) && (
        <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
          <Trophy size={14} color={c.success} />
          <Txt tone="success">{a.viewer.won ? t("auction.won") : t("auction.leading")}</Txt>
        </View>
      )}
      {a.viewer.won && <Button label={t("challenge.watch")} onPress={() => router.push(`/watch/${a.video.id}`)} />}
      {a.phase === "OPEN" && !a.viewer.isCreator && (
        a.viewer.signedIn ? (
          <Card style={{ gap: space.md }}>
            <AmountPicker amounts={a.suggestedBidsCents} value={chosen} onChange={setAmount} />
            <Button label={t("auction.bid", { amount: usd(chosen) })} onPress={() => void bid()} loading={busy} />
            {a.viewer.balanceCents !== null && (
              <Txt variant="caption" tone="textSecondary">
                {t("challenge.balance", { amount: usd(a.viewer.balanceCents) })}
              </Txt>
            )}
            {message && <Txt variant="caption">{message}</Txt>}
          </Card>
        ) : (
          <Button label={t("challenge.signIn")} variant="secondary" onPress={() => router.push("/me")} />
        )
      )}
      {a.recentBids.length > 0 && (
        <Card style={{ gap: space.sm }}>
          {a.recentBids.map((b) => (
            <View key={b.id} style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Txt tone="textSecondary">{b.mine ? t("challenge.you") : t("auction.bidder", { n: b.alias })}</Txt>
              <Txt variant="mono">{usd(b.amountCents)}</Txt>
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({ thumb: { aspectRatio: 16 / 9, borderRadius: radius.lg, overflow: "hidden" } });
