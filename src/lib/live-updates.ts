import type { TopicEvent } from "./live-topic";
import type { AuctionView, ChallengeView } from "./types";

/**
 * What a live event changes on screen at once, before the reload that follows it (the event says what every viewer
 * may know — aliases, totals — never who the viewer is: "you lead" comes back with the reload). Numbers only grow: a
 * late or repeated event never takes a price or a pot back down, and a bid or a pledge is listed once.
 */
export function applyAuctionEvent(a: AuctionView, event: TopicEvent): { view: AuctionView; reload: boolean } {
  if (event.type === "connected" || event.type === "state") return { view: a, reload: true };
  if (event.type !== "bid") return { view: a, reload: false };
  const bid = event.bid as { id?: string; amountCents?: number; alias?: number } | undefined;
  const highest = Number(event.highestBidCents);
  if (!bid?.id || !Number.isFinite(highest)) return { view: a, reload: true };
  if (highest < a.highestBidCents) return { view: a, reload: true };
  const known = a.recentBids.some((b) => b.id === bid.id);
  const view: AuctionView = {
    ...a,
    highestBidCents: highest,
    bidsCount: Math.max(a.bidsCount, Number(event.bidsCount) || 0),
    minimumNextBidCents: Number(event.minimumNextBidCents) || a.minimumNextBidCents,
    suggestedBidsCents: Array.isArray(event.suggestedBidsCents) ? (event.suggestedBidsCents as number[]) : a.suggestedBidsCents,
    endsAt: typeof event.endsAt === "string" ? event.endsAt : a.endsAt,
    recentBids: known ? a.recentBids : [{ id: bid.id, amountCents: bid.amountCents ?? highest, alias: bid.alias ?? 0, mine: false }, ...a.recentBids],
  };
  return { view, reload: true };
}

export function applyChallengeEvent(c: ChallengeView, event: TopicEvent): { view: ChallengeView; reload: boolean } {
  if (event.type !== "pledge") return { view: c, reload: true };
  const pledge = event.pledge as { id?: string; amountCents?: number; alias?: number } | undefined;
  const pledged = Number(event.pledgedCents);
  if (!pledge?.id || !Number.isFinite(pledged)) return { view: c, reload: true };
  const grows = pledged >= c.pledgedCents;
  const known = c.recentPledges.some((p) => p.id === pledge.id);
  const view: ChallengeView = {
    ...c,
    pledgedCents: grows ? pledged : c.pledgedCents,
    backersCount: Math.max(c.backersCount, Number(event.backersCount) || 0),
    progress: grows && typeof event.progress === "number" ? event.progress : c.progress,
    recentPledges: known ? c.recentPledges : [{ id: pledge.id, alias: pledge.alias ?? 0, amountCents: pledge.amountCents ?? 0, mine: false }, ...c.recentPledges],
  };
  return { view, reload: true };
}
