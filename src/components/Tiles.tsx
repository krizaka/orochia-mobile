import React from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Clapperboard, Flame, Gavel, Lock, Megaphone, Target, Users } from "lucide-react-native";
import { Avatar, Badge, Card, Countdown, Progress, Txt, useTheme } from "@krizaka/ui/native";
import { compact, t, usd } from "@/i18n";
import { auctionCountdown, auctionPrice } from "@/lib/auction-presenter";
import { challengeRatio, TICKING } from "@/lib/challenge";
import { absoluteUrl } from "@/lib/config";
import { countdownUnits } from "@/lib/countdown";
import { space } from "@/lib/theme";
import type { AuctionCard, ChallengeCard, VideoSummary } from "@/lib/types";

const duration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** A caption over a countdown: what the clock counts to, then the time left. */
function Clock({ target, label }: { target: string; label: string }) {
  return (
    <View style={{ alignItems: "flex-end", gap: 2 }}>
      <Txt variant="caption" tone="muted">
        {label}
      </Txt>
      <Countdown target={target} label={label} units={countdownUnits()} size="sm" urgentBelowMs={120_000} />
    </View>
  );
}

/** A badge on a picture: an icon and a word, white on the scrim. */
function MediaBadge({ icon, children }: { icon?: React.ReactNode; children: string }) {
  return (
    <Badge tone="scrim" size="md">
      {icon}
      <Txt variant="caption" tone="onMedia" style={styles.badgeText}>
        {children}
      </Txt>
    </Badge>
  );
}

/** A video in a list: picture, duration, lock when it is not free, creator and views — opens the player. */
export function VideoTile({ v }: { v: VideoSummary }) {
  const { theme } = useTheme();
  const locked = v.visibility !== "PUBLIC";
  return (
    <Card.Root testID={`video-${v.id}`} aria-label={v.title} onPress={() => router.push(`/watch/${v.id}`)}>
      <Card.Media>
        <Card.Image src={absoluteUrl(v.thumbnailUrl)} fallback={<Clapperboard size={32} color={theme.accent} />} />
        {locked && (
          <Card.Overlay corner="top-left">
            <MediaBadge icon={<Lock size={12} color={theme.textOnMedia} />}>{t(`visibility.${v.visibility as "PUBLIC"}`)}</MediaBadge>
          </Card.Overlay>
        )}
        <Card.Overlay corner="bottom-right">
          <MediaBadge>{duration(v.durationSeconds)}</MediaBadge>
        </Card.Overlay>
      </Card.Media>
      <Card.Body style={styles.row}>
        <Avatar src={absoluteUrl(v.creatorAvatar)} alt={v.creatorName} size="sm" />
        <View style={{ flex: 1 }}>
          <Card.Title numberOfLines={2}>{v.title}</Card.Title>
          <Card.Description numberOfLines={1}>{`${v.creatorName} · ${t("video.views", { count: compact(v.viewsCount) })}`}</Card.Description>
        </View>
      </Card.Body>
    </Card.Root>
  );
}

const KIND_ICONS = { GOAL: Target, REQUEST: Flame, OPEN_CALL: Megaphone } as const;

/** A challenge in a list: kind, stage, the pot as a ring, backers and the clock — opens it. */
export function ChallengeTile({ ch }: { ch: ChallengeCard }) {
  const { theme } = useTheme();
  const Icon = KIND_ICONS[ch.kind];
  const clock = TICKING.has(ch.stage)
    ? { target: ch.deadline, label: t("challenge.endsIn") }
    : ch.stage === "IN_PROGRESS" && ch.deliveryDeadline
      ? { target: ch.deliveryDeadline, label: t("challenge.deliverIn") }
      : null;
  return (
    <Card.Root testID={`challenge-${ch.id}`} aria-label={ch.title} onPress={() => router.push(`/challenges/${ch.id}`)}>
      <Card.Body>
        <View style={[styles.row, styles.between]}>
          <Badge tone="accent" size="md">
            <Icon size={12} color={theme.accent2} />
            <Txt variant="caption" style={styles.badgeText}>
              {t(`challenge.kind.${ch.kind}`).toUpperCase()}
            </Txt>
          </Badge>
          <Txt variant="caption" tone="secondary">
            {t(`challenge.stage.${ch.stage}`)}
          </Txt>
        </View>
        <View style={[styles.row, { gap: space.lg }]}>
          <Progress variant="ring" size="md" value={challengeRatio(ch)} max={1} label={t("challenge.raised")} valueText={usd(ch.pledgedCents)}>
            <Txt variant="caption" style={{ fontWeight: "900" }}>
              {usd(ch.pledgedCents)}
            </Txt>
          </Progress>
          <View style={{ flex: 1, gap: space.xs }}>
            <Card.Title numberOfLines={2}>{ch.title}</Card.Title>
            <View style={[styles.row, { gap: 6 }]}>
              <Users size={12} color={theme.textMuted} />
              <Txt variant="caption" tone="muted">
                {t("challenge.backers", { count: ch.backersCount })}
              </Txt>
            </View>
          </View>
        </View>
        <Card.Footer style={styles.between}>
          <View style={[styles.row, { flex: 1 }]}>
            {ch.creator ? <Avatar src={absoluteUrl(ch.creator.avatarUrl)} alt={ch.creator.name} size="xs" /> : null}
            <Txt variant="caption" tone="secondary" numberOfLines={1} style={{ flex: 1 }}>
              {ch.creator ? ch.creator.name : t("challenge.anyCreator")}
            </Txt>
          </View>
          {clock ? <Clock target={clock.target} label={clock.label} /> : null}
        </Card.Footer>
      </Card.Body>
    </Card.Root>
  );
}

/** An auction in a list: picture, state, price, clock, creator — opens it. Read like the web card (auction-presenter). */
export function AuctionTile({ a }: { a: AuctionCard }) {
  const { theme } = useTheme();
  const price = auctionPrice(a);
  const countdown = auctionCountdown(a);
  return (
    <Card.Root testID={`auction-${a.id}`} aria-label={a.title} onPress={() => router.push(`/auctions/${a.id}`)}>
      <Card.Media>
        <Card.Image src={absoluteUrl(a.thumbnailUrl)} fallback={<Gavel size={32} color={theme.accent} />} />
        <Card.Overlay corner="top-left">
          <Badge tone="scrim" size="md" dot={a.phase === "OPEN"} pulse={a.phase === "OPEN"}>
            {t(`auction.phase.${a.phase as "OPEN"}`)}
          </Badge>
        </Card.Overlay>
      </Card.Media>
      <Card.Body>
        <Card.Title>{a.title}</Card.Title>
        <View style={[styles.row, styles.between, { alignItems: "flex-end" }]}>
          <View>
            <Txt variant="caption" tone="muted">
              {t(price.labelKey)}
            </Txt>
            <Txt variant="title">{usd(price.cents)}</Txt>
          </View>
          {countdown ? <Clock target={countdown.target} label={t(countdown.labelKey)} /> : null}
        </View>
        <Card.Footer>
          <Avatar src={absoluteUrl(a.creatorAvatar)} alt={a.creatorName} size="xs" />
          <Txt variant="caption" tone="secondary" numberOfLines={1} style={{ flex: 1 }}>
            {a.creatorName}
          </Txt>
          <Txt variant="caption" tone="secondary">
            {t("auction.bids", { count: a.bidsCount })}
          </Txt>
        </Card.Footer>
      </Card.Body>
    </Card.Root>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.sm },
  between: { justifyContent: "space-between" },
  badgeText: { fontWeight: "700", fontSize: 11, letterSpacing: 0.5 },
});
