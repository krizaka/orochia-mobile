import React, { useCallback, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { Crown, Lock } from "lucide-react-native";
import { AmountPicker } from "@/components/AmountPicker";
import { Countdown } from "@/components/Countdown";
import { ProgressRing } from "@/components/ProgressRing";
import { Avatar, Button, Card, Skeleton, Txt } from "@/components/ui";
import { t, usd } from "@/i18n";
import { api } from "@/lib/api";
import { errorText } from "@/lib/errors";
import { usePolling } from "@/lib/usePolling";
import { useApi } from "@/lib/useApi";
import { space, useTheme } from "@/lib/theme";
import type { ChallengeView } from "@/lib/types";

const TICKING = new Set(["FUNDING", "GOAL_REACHED", "AWAITING_ANSWER", "CASTING"]);

/**
 * One challenge: the pot as a ring that fills as pledges land, the clock, the leaderboard by alias, and backing it in
 * one tap — credits held until the creator delivers. Kept current while it is open.
 */
export default function Challenge() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const view = useApi<{ challenge: ChallengeView }>(`/api/challenges/${id}`);
  const ch = view.data?.challenge;
  const [amount, setAmount] = useState(1000);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const live = Boolean(ch) && (TICKING.has(ch?.stage ?? "") || ch?.stage === "IN_PROGRESS");
  const { reload } = view;
  const tick = useCallback(() => void reload(), [reload]);
  usePolling(tick, 5000, live);

  const pledge = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await api(`/api/challenges/${id}/pledges`, { method: "POST", body: { amountCents: amount } });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      setMessage(t("challenge.pledged"));
      await reload();
    } catch (e) {
      setMessage(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  if (!ch) return <View style={{ padding: space.lg }}>{view.loading ? <Skeleton height={320} /> : <Txt>{t("errors.generic")}</Txt>}</View>;
  const ratio = ch.progress ?? Math.min(1, ch.pledgedCents / 100_00);
  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }} refreshControl={<RefreshControl refreshing={view.refreshing} onRefresh={() => void view.refresh()} tintColor={c.accent} />}>
      <View style={{ gap: space.sm }}>
        <Txt variant="caption" tone="accent" style={{ fontWeight: "800", letterSpacing: 1 }}>
          {`${t(`challenge.kind.${ch.kind}`)} · ${t(`challenge.stage.${ch.stage}`)}`.toUpperCase()}
        </Txt>
        <Txt variant="display">{ch.title}</Txt>
        {ch.creator ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
            <Avatar uri={ch.creator.avatarUrl} size={28} />
            <Txt tone="textSecondary">{ch.creator.name}</Txt>
          </View>
        ) : (
          <Txt tone="textSecondary">{t("challenge.anyCreator")}</Txt>
        )}
      </View>

      <Card style={{ alignItems: "center", gap: space.md }}>
        <ProgressRing ratio={ratio} size={168} stroke={12}>
          <Txt variant="display" style={{ fontSize: 26 }}>
            {usd(ch.pledgedCents)}
          </Txt>
          {ch.goalCents !== null && (
            <Txt variant="caption" tone="textSecondary">
              {t("challenge.ofGoal", { goal: usd(ch.goalCents) })}
            </Txt>
          )}
        </ProgressRing>
        <Txt variant="caption" tone="textSecondary">
          {t("challenge.backers", { count: ch.backersCount })}
        </Txt>
        {TICKING.has(ch.stage) && <Countdown target={ch.deadline} label={t("challenge.endsIn")} size="lg" />}
        {ch.stage === "IN_PROGRESS" && ch.deliveryDeadline && <Countdown target={ch.deliveryDeadline} label={t("challenge.deliverIn")} size="lg" />}
      </Card>

      <Txt tone="textSecondary">{ch.description}</Txt>

      {ch.delivered && (
        <Card style={{ gap: space.md }}>
          {ch.delivered.canWatch && ch.delivered.videoId ? (
            <Button label={t("challenge.watch")} onPress={() => router.push(`/watch/${ch.delivered?.videoId}`)} />
          ) : (
            <Txt tone="textSecondary">{t("challenge.deliveredLocked")}</Txt>
          )}
        </Card>
      )}

      {ch.viewer.canPledge ? (
        <Card style={{ gap: space.md }}>
          <AmountPicker amounts={ch.suggestedPledgesCents} value={amount} onChange={setAmount} />
          <Button label={t("challenge.pledge", { amount: usd(amount) })} onPress={() => void pledge()} loading={busy} />
          <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
            <Lock size={12} color={c.textTertiary} />
            <Txt variant="caption" tone="textTertiary" style={{ flex: 1 }}>
              {t("challenge.held")}
            </Txt>
          </View>
          {ch.viewer.balanceCents !== null && (
            <Txt variant="caption" tone="textSecondary">
              {t("challenge.balance", { amount: usd(ch.viewer.balanceCents) })}
            </Txt>
          )}
          {ch.viewer.pledgedCents > 0 && (
            <Txt variant="caption" tone="success">
              {t("challenge.yours", { amount: usd(ch.viewer.pledgedCents) })}
            </Txt>
          )}
          {message && <Txt variant="caption">{message}</Txt>}
        </Card>
      ) : !ch.viewer.signedIn && TICKING.has(ch.stage) ? (
        <Button label={t("challenge.signIn")} variant="secondary" onPress={() => router.push("/me")} />
      ) : null}

      {ch.topBackers.length > 0 && (
        <Card style={{ gap: space.sm }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Crown size={14} color={c.warning} />
            <Txt variant="label">{t("challenge.leaderboard")}</Txt>
          </View>
          {ch.topBackers.map((b, i) => (
            <View key={b.alias} style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Txt tone="textSecondary">{`${i + 1}. ${b.mine ? t("challenge.you") : t("challenge.backer", { n: b.alias })}`}</Txt>
              <Txt variant="mono">{usd(b.totalCents)}</Txt>
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}
