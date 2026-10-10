import React, { useCallback, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { Crown, Lock } from "lucide-react-native";
import { Avatar, Button, Card, Countdown, Progress, Skeleton, Txt, useTheme } from "@krizaka/ui/native";
import { AmountPicker } from "@/components/AmountPicker";
import { t, usd } from "@/i18n";
import { api } from "@/lib/api";
import { absoluteUrl } from "@/lib/config";
import { countdownUnits, useClockSkew } from "@/lib/countdown";
import { challengeRatio, TICKING } from "@/lib/challenge";
import { errorText } from "@/lib/errors";
import { withTap } from "@/lib/haptics";
import { usePolling } from "@/lib/usePolling";
import { useApi } from "@/lib/useApi";
import { space } from "@/lib/theme";
import type { ChallengeView } from "@/lib/types";

/**
 * One challenge: the pot as a ring that fills as pledges land, the clock, the leaderboard by alias, and backing it in
 * one tap — credits held until the creator delivers. Kept current while it is open.
 */
export default function Challenge() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const view = useApi<{ challenge: ChallengeView }>(`/api/challenges/${id}`);
  const ch = view.data?.challenge;
  const [amount, setAmount] = useState(1000);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const live = Boolean(ch) && (TICKING.has(ch?.stage ?? "") || ch?.stage === "IN_PROGRESS");
  const { reload } = view;
  const tick = useCallback(() => void reload(), [reload]);
  usePolling(tick, 5000, live);
  const skewMs = useClockSkew(ch?.serverNow);

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

  if (!ch) return <View style={{ padding: space.lg }}>{view.loading ? <Skeleton shape="rect" height={320} /> : <Txt>{t("errors.generic")}</Txt>}</View>;
  const clock = TICKING.has(ch.stage) ? { target: ch.deadline, label: t("challenge.endsIn") } : ch.stage === "IN_PROGRESS" && ch.deliveryDeadline ? { target: ch.deliveryDeadline, label: t("challenge.deliverIn") } : null;
  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }} refreshControl={<RefreshControl refreshing={view.refreshing} onRefresh={() => void view.refresh()} tintColor={theme.accent} />}>
      <View style={{ gap: space.sm }}>
        <Txt variant="caption" tone="accent" style={{ fontWeight: "800", letterSpacing: 1 }}>
          {`${t(`challenge.kind.${ch.kind}`)} · ${t(`challenge.stage.${ch.stage}`)}`.toUpperCase()}
        </Txt>
        <Txt variant="display">{ch.title}</Txt>
        {ch.creator ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
            <Avatar src={absoluteUrl(ch.creator.avatarUrl)} alt={ch.creator.name} size={28} />
            <Txt tone="secondary">{ch.creator.name}</Txt>
          </View>
        ) : (
          <Txt tone="secondary">{t("challenge.anyCreator")}</Txt>
        )}
      </View>

      <Card.Root>
        <Card.Body style={{ alignItems: "center" }}>
        <Progress variant="ring" size="lg" value={challengeRatio(ch)} max={1} label={t("challenge.raised")} valueText={usd(ch.pledgedCents)}>
          <Txt variant="display" style={{ fontSize: 26 }}>
            {usd(ch.pledgedCents)}
          </Txt>
          {ch.goalCents !== null && (
            <Txt variant="caption" tone="secondary">
              {t("challenge.ofGoal", { goal: usd(ch.goalCents) })}
            </Txt>
          )}
        </Progress>
        <Txt variant="caption" tone="secondary">
          {t("challenge.backers", { count: ch.backersCount })}
        </Txt>
        {clock && (
          <View style={{ alignItems: "center", gap: 2 }}>
            <Txt variant="caption" tone="muted">
              {clock.label}
            </Txt>
            <Countdown target={clock.target} skewMs={skewMs} label={clock.label} units={countdownUnits()} size="md" urgentBelowMs={120_000} />
          </View>
        )}
        </Card.Body>
      </Card.Root>

      <Txt tone="secondary">{ch.description}</Txt>

      {ch.delivered && (
        <Card.Root>
          <Card.Body>
          {ch.delivered.canWatch && ch.delivered.videoId ? (
            <Button label={t("challenge.watch")} variant="primary" size="lg" onPress={withTap(() => router.push(`/watch/${ch.delivered?.videoId}`))} />
          ) : (
            <Txt tone="secondary">{t("challenge.deliveredLocked")}</Txt>
          )}
          </Card.Body>
        </Card.Root>
      )}

      {ch.viewer.canPledge ? (
        <Card.Root>
          <Card.Body>
          <AmountPicker amounts={ch.suggestedPledgesCents} value={amount} onChange={setAmount} label={t("challenge.amounts")} />
          <Button label={t("challenge.pledge", { amount: usd(amount) })} variant="primary" size="lg" onPress={withTap(() => void pledge())} loading={busy} />
          <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
            <Lock size={12} color={theme.textMuted} />
            <Txt variant="caption" tone="muted" style={{ flex: 1 }}>
              {t("challenge.held")}
            </Txt>
          </View>
          {ch.viewer.balanceCents !== null && (
            <Txt variant="caption" tone="secondary">
              {t("challenge.balance", { amount: usd(ch.viewer.balanceCents) })}
            </Txt>
          )}
          {ch.viewer.pledgedCents > 0 && (
            <Txt variant="caption" tone="success">
              {t("challenge.yours", { amount: usd(ch.viewer.pledgedCents) })}
            </Txt>
          )}
          {message && <Txt variant="caption">{message}</Txt>}
          </Card.Body>
        </Card.Root>
      ) : !ch.viewer.signedIn && TICKING.has(ch.stage) ? (
        <Button label={t("challenge.signIn")} variant="secondary" size="lg" onPress={withTap(() => router.push("/me"))} />
      ) : null}

      {ch.topBackers.length > 0 && (
        <Card.Root>
          <Card.Body style={{ gap: space.sm }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Crown size={14} color={theme.warning} />
            <Txt variant="label">{t("challenge.leaderboard")}</Txt>
          </View>
          {ch.topBackers.map((b, i) => (
            <View key={b.alias} style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Txt tone="secondary">{`${i + 1}. ${b.mine ? t("challenge.you") : t("challenge.backer", { n: b.alias })}`}</Txt>
              <Txt variant="mono">{usd(b.totalCents)}</Txt>
            </View>
          ))}
          </Card.Body>
        </Card.Root>
      )}
    </ScrollView>
  );
}
