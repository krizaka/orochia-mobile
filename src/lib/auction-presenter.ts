import type { MessageKey } from "@/i18n";
import type { AuctionCard } from "./types";

// A copy of the web app's presenter (krizaka/orochia, apps/web/components/auctions/auction-presenter.ts) so that an
// auction reads the same on the web and in the app. A future shared package (@krizaka/orochia-shared) can carry it
// for both; until then, change both together.

type Priced = Pick<AuctionCard, "phase" | "bidsCount" | "highestBidCents" | "startingPriceCents">;
type Timed = Pick<AuctionCard, "phase" | "startsAt" | "endsAt">;

/** The price an auction shows and its caption: the starting price until a bid, then the current bid — or the sale price. */
export function auctionPrice(a: Priced): { cents: number; labelKey: MessageKey } {
  const hasBids = a.bidsCount > 0;
  return {
    cents: hasBids ? a.highestBidCents : a.startingPriceCents,
    labelKey: !hasBids ? "auction.startingPrice" : a.phase === "SOLD" ? "auction.soldFor" : "auction.currentBid",
  };
}

/** The moment an auction counts down to: its end while open, its start while upcoming; nothing once it has closed. */
export function auctionCountdown(a: Timed): { target: string; labelKey: MessageKey } | null {
  if (a.phase === "OPEN") return { target: a.endsAt, labelKey: "auction.endsIn" };
  if (a.phase === "UPCOMING") return { target: a.startsAt, labelKey: "auction.startsIn" };
  return null;
}
