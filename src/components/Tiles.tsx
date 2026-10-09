import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Flame, Gavel, Lock, Megaphone, Target, Users } from "lucide-react-native";
import { compact, t, usd } from "@/i18n";
import { absoluteUrl } from "@/lib/config";
import { radius, space, useTheme } from "@/lib/theme";
import type { AuctionCard, ChallengeCard, VideoSummary } from "@/lib/types";
import { Countdown } from "./Countdown";
import { ProgressRing } from "./ProgressRing";
import { Avatar, Card, Txt } from "./ui";

const duration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** A video in a list: picture, duration, lock when it is not free, creator and views — opens the player. */
export function VideoTile({ v }: { v: VideoSummary }) {
  const { c } = useTheme();
  const locked = v.visibility !== "PUBLIC";
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={v.title} onPress={() => router.push(`/watch/${v.id}`)} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      <View style={[styles.thumb, { backgroundColor: c.surfaceElevated }]}>
        <Image source={absoluteUrl(v.thumbnailUrl)} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        {locked && (
          <View style={[styles.badge, { left: space.sm }]}>
            <Lock size={12} color="#fff" />
            <Txt variant="caption" style={{ color: "#fff", fontWeight: "700" }}>
              {t(`visibility.${v.visibility as "PUBLIC"}`)}
            </Txt>
          </View>
        )}
        <View style={[styles.badge, { right: space.sm }]}>
          <Txt variant="caption" style={{ color: "#fff", fontWeight: "700" }}>
            {duration(v.durationSeconds)}
          </Txt>
        </View>
      </View>
      <View style={styles.meta}>
        <Avatar uri={v.creatorAvatar} size={32} />
        <View style={{ flex: 1 }}>
          <Txt variant="label" numberOfLines={2}>
            {v.title}
          </Txt>
          <Txt variant="caption" tone="textSecondary">
            {v.creatorName} · {t("video.views", { count: compact(v.viewsCount) })}
          </Txt>
        </View>
      </View>
    </Pressable>
  );
}

const KIND_ICONS = { GOAL: Target, REQUEST: Flame, OPEN_CALL: Megaphone } as const;
const TICKING = new Set(["FUNDING", "GOAL_REACHED", "AWAITING_ANSWER", "CASTING"]);

/** A challenge in a list: kind, stage, the pot as a ring, backers and the clock — opens it. */
export function ChallengeTile({ ch }: { ch: ChallengeCard }) {
  const { c } = useTheme();
  const Icon = KIND_ICONS[ch.kind];
  const ratio = ch.progress ?? Math.min(1, ch.pledgedCents / 100_00);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={ch.title} onPress={() => router.push(`/challenges/${ch.id}`)}>
      <Card style={{ gap: space.md }}>
        <View style={styles.row}>
          <View style={[styles.row, { gap: 6 }]}>
            <Icon size={14} color={c.magenta} />
            <Txt variant="caption" tone="accent" style={{ fontWeight: "800", letterSpacing: 1 }}>
              {t(`challenge.kind.${ch.kind}`).toUpperCase()}
            </Txt>
          </View>
          <Txt variant="caption" tone="textSecondary">
            {t(`challenge.stage.${ch.stage}`)}
          </Txt>
        </View>
        <View style={[styles.row, { justifyContent: "flex-start", gap: space.lg }]}>
          <ProgressRing ratio={ratio} size={72} stroke={7}>
            <Txt variant="caption" style={{ fontWeight: "900" }}>
              {usd(ch.pledgedCents)}
            </Txt>
          </ProgressRing>
          <View style={{ flex: 1, gap: 4 }}>
            <Txt variant="label" numberOfLines={2}>
              {ch.title}
            </Txt>
            <View style={[styles.row, { justifyContent: "flex-start", gap: 6 }]}>
              <Users size={12} color={c.textTertiary} />
              <Txt variant="caption" tone="textTertiary">
                {t("challenge.backers", { count: ch.backersCount })}
              </Txt>
            </View>
          </View>
        </View>
        <View style={styles.row}>
          <View style={[styles.row, { gap: 8 }]}>
            {ch.creator ? <Avatar uri={ch.creator.avatarUrl} size={20} /> : null}
            <Txt variant="caption" tone="textSecondary">
              {ch.creator ? ch.creator.name : t("challenge.anyCreator")}
            </Txt>
          </View>
          {TICKING.has(ch.stage) ? <Countdown target={ch.deadline} label={t("challenge.endsIn")} /> : ch.stage === "IN_PROGRESS" && ch.deliveryDeadline ? <Countdown target={ch.deliveryDeadline} label={t("challenge.deliverIn")} /> : null}
        </View>
      </Card>
    </Pressable>
  );
}

/** An auction in a list: picture, price, clock — opens it. */
export function AuctionTile({ a }: { a: AuctionCard }) {
  const { c } = useTheme();
  const price = a.bidsCount > 0 ? a.highestBidCents : a.startingPriceCents;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={a.title} onPress={() => router.push(`/auctions/${a.id}`)}>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <View style={[styles.thumb, { borderRadius: 0, backgroundColor: c.surfaceElevated }]}>
          <Image source={absoluteUrl(a.thumbnailUrl)} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
          <View style={[styles.badge, { left: space.sm }]}>
            <Gavel size={12} color="#fff" />
            <Txt variant="caption" style={{ color: "#fff", fontWeight: "700" }}>
              {t(`auction.phase.${a.phase as "OPEN"}`)}
            </Txt>
          </View>
        </View>
        <View style={[styles.row, { padding: space.lg }]}>
          <View style={{ flex: 1 }}>
            <Txt variant="label" numberOfLines={1}>
              {a.title}
            </Txt>
            <Txt variant="title">{usd(price)}</Txt>
          </View>
          {a.phase === "OPEN" ? <Countdown target={a.endsAt} label={t("auction.endsIn")} /> : null}
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  thumb: { aspectRatio: 16 / 9, borderRadius: radius.lg, overflow: "hidden" },
  badge: { position: "absolute", top: space.sm, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  meta: { flexDirection: "row", gap: space.md, paddingTop: space.md },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});
