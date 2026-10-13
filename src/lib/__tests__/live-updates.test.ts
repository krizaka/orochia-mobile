import { describe, expect, it } from "@jest/globals";
import { applyAuctionEvent, applyChallengeEvent } from "@/lib/live-updates";
import type { AuctionView, ChallengeView } from "@/lib/types";

const auction = {
  id: "a1",
  status: "OPEN",
  phase: "OPEN",
  rights: "WATCH",
  highestBidCents: 1000,
  bidsCount: 1,
  minimumNextBidCents: 1100,
  suggestedBidsCents: [1100, 1200],
  endsAt: "2026-10-12T20:00:00.000Z",
  serverNow: "2026-10-12T19:00:00.000Z",
  video: { id: "v1", title: "Tokyo Neon", thumbnailUrl: null },
  creator: { id: "c", username: "elenavox", name: "Elena", avatarUrl: null },
  recentBids: [{ id: "b1", amountCents: 1000, alias: 1, mine: true }],
  viewer: { signedIn: true, isCreator: false, isLeader: true, won: false, balanceCents: 5000 },
} as unknown as AuctionView;

const bid = {
  type: "bid",
  bid: { id: "b2", amountCents: 1200, alias: 2, createdAt: "2026-10-12T19:58:30.000Z" },
  highestBidCents: 1200,
  bidsCount: 2,
  leaderAlias: 2,
  endsAt: "2026-10-12T20:02:00.000Z",
  extended: true,
  minimumNextBidCents: 1300,
  suggestedBidsCents: [1300, 1500],
};

describe("an auction, live", () => {
  it("a bid moves the price, the count, the minimum, the clock (soft close) and the list at once", () => {
    const { view } = applyAuctionEvent(auction, bid);
    expect(view).toMatchObject({ highestBidCents: 1200, bidsCount: 2, minimumNextBidCents: 1300, suggestedBidsCents: [1300, 1500], endsAt: "2026-10-12T20:02:00.000Z" });
    expect(view.recentBids.map((b) => b.id)).toEqual(["b2", "b1"]);
    expect(view.recentBids[0].mine).toBe(false);
  });

  it("asks for a reload to learn who leads now (the event carries aliases, never the viewer)", () => {
    expect(applyAuctionEvent(auction, bid).reload).toBe(true);
  });

  it("the same bid twice (a reconnection) is listed once", () => {
    const once = applyAuctionEvent(auction, bid).view;
    expect(applyAuctionEvent(once, bid).view.recentBids.map((b) => b.id)).toEqual(["b2", "b1"]);
  });

  it("an older event never takes the price back down", () => {
    const newer = applyAuctionEvent(auction, bid).view;
    const late = applyAuctionEvent(newer, { ...bid, bid: { ...bid.bid, id: "b0", amountCents: 1100 }, highestBidCents: 1100, bidsCount: 1 }).view;
    expect(late.highestBidCents).toBe(1200);
    expect(late.bidsCount).toBe(2);
  });

  it("a change of state (closed, cancelled) and a (re)connection reload it; anything else is ignored", () => {
    expect(applyAuctionEvent(auction, { type: "state", status: "SOLD" })).toEqual({ view: auction, reload: true });
    expect(applyAuctionEvent(auction, { type: "connected" })).toEqual({ view: auction, reload: true });
    expect(applyAuctionEvent(auction, { type: "whatever" })).toEqual({ view: auction, reload: false });
    expect(applyAuctionEvent(auction, { type: "bid" })).toEqual({ view: auction, reload: true }); // malformed: ask the server
  });
});

const challenge = {
  id: "c1",
  stage: "FUNDING",
  pledgedCents: 500,
  backersCount: 1,
  progress: 0.25,
  goalCents: 2000,
  recentPledges: [{ id: "p1", alias: 1, amountCents: 500, mine: true }],
} as unknown as ChallengeView;
const pledge = { type: "pledge", pledge: { id: "p2", alias: 2, amountCents: 1500, createdAt: "2026-10-12T19:00:00.000Z" }, pledgedCents: 2000, backersCount: 2, progress: 1 };

describe("a challenge, live", () => {
  it("a pledge fills the pot and the list at once, then reloads (the stage may have moved)", () => {
    const { view, reload } = applyChallengeEvent(challenge, pledge);
    expect(view).toMatchObject({ pledgedCents: 2000, backersCount: 2, progress: 1 });
    expect(view.recentPledges.map((p) => p.id)).toEqual(["p2", "p1"]);
    expect(reload).toBe(true);
  });

  it("never goes back down on a late event, lists a pledge once", () => {
    const filled = applyChallengeEvent(challenge, pledge).view;
    const again = applyChallengeEvent(filled, { ...pledge, pledgedCents: 500, backersCount: 1, progress: 0.25 }).view;
    expect(again).toMatchObject({ pledgedCents: 2000, backersCount: 2, progress: 1 });
    expect(again.recentPledges).toHaveLength(2);
  });

  it("any other event (a state change, a reconnection) reloads it", () => {
    expect(applyChallengeEvent(challenge, { type: "state" }).reload).toBe(true);
    expect(applyChallengeEvent(challenge, { type: "connected" }).reload).toBe(true);
  });
});
