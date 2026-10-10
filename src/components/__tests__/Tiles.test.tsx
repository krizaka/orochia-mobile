import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { ThemeProvider } from "@krizaka/ui/native";
import { nativeTheme } from "@krizaka/orochia-design-system/tokens";
import { router } from "expo-router";
import { AuctionTile, ChallengeTile, VideoTile } from "@/components/Tiles";
import type { AuctionCard, ChallengeCard, VideoSummary } from "@/lib/types";

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
// The icon set ships ES modules only; the tiles' words and roles are what is tested, not the pictograms.
jest.mock("lucide-react-native", () => new Proxy({}, { get: () => () => null }));

const push = router.push as jest.Mock;
const inTheme = async (node: React.ReactElement) => await render(<ThemeProvider overrides={nativeTheme}>{node}</ThemeProvider>);
const soon = () => new Date(Date.now() + 3 * 3_600_000).toISOString();

const video: VideoSummary = {
  id: "v1",
  title: "Night ride",
  creatorName: "Mira",
  creatorUsername: "mira",
  creatorAvatar: null,
  thumbnailUrl: null,
  durationSeconds: 201,
  visibility: "TIPPED_UNLOCKED",
  minTipAmountCents: 0,
  viewsCount: 12_300,
  likesCount: 4,
};

const challenge: ChallengeCard = {
  id: "c1",
  kind: "GOAL",
  stage: "FUNDING",
  deliverable: "VIDEO",
  reward: "BACKERS",
  title: "Dance on the roof",
  goalCents: 10_000,
  pledgedCents: 4200,
  backersCount: 7,
  progress: 0.42,
  deadline: soon(),
  deliveryDeadline: null,
  creator: { name: "Mira", username: "mira", avatarUrl: null },
  applicationsCount: 0,
};

const auction: AuctionCard = {
  id: "a1",
  phase: "OPEN",
  rights: "WATCH",
  highestBidCents: 0,
  startingPriceCents: 1500,
  bidsCount: 0,
  startsAt: "2026-10-09T10:00:00.000Z",
  endsAt: soon(),
  videoId: "v1",
  title: "The first cut",
  thumbnailUrl: null,
  creatorName: "Mira",
  creatorAvatar: null,
};

// The ring sweeps and the clocks tick on timers: run them under Jest's clock, not the wall's.
jest.useFakeTimers();
beforeEach(() => {
  push.mockClear();
});

describe("VideoTile", () => {
  it("is a button named by its title that opens the player", async () => {
    await inTheme(<VideoTile v={video} />);
    expect(screen.getByText("3:21")).toBeTruthy();
    expect(screen.getByText("Unlock")).toBeTruthy();
    expect(screen.getByText("Mira · 12.3K views")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Night ride" }));
    expect(push).toHaveBeenCalledWith("/watch/v1");
  });
});

describe("ChallengeTile", () => {
  it("shows the pot as a progress ring, the backers and the clock", async () => {
    await inTheme(<ChallengeTile ch={challenge} />);
    const ring = screen.getByRole("progressbar");
    expect(ring.props["aria-label"]).toBe("Raised so far");
    expect(ring.props["aria-valuetext"]).toBe("$42.00");
    expect(screen.getByText("Backers · 7")).toBeTruthy();
    expect(screen.getByRole("timer")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: /Dance on the roof/ }));
    expect(push).toHaveBeenCalledWith("/challenges/c1");
  });

  it("has no clock once the pot has closed", async () => {
    await inTheme(<ChallengeTile ch={{ ...challenge, stage: "DELIVERED" }} />);
    expect(screen.queryByRole("timer")).toBeNull();
  });
});

describe("AuctionTile", () => {
  it("reads like the web card: the starting price until a bid, the end while open", async () => {
    await inTheme(<AuctionTile a={auction} />);
    expect(screen.getByText("Starting price")).toBeTruthy();
    expect(screen.getByText("$15.00")).toBeTruthy();
    expect(screen.getAllByText("Ends in").length).toBeGreaterThan(0);
    await fireEvent.press(screen.getByRole("button", { name: /The first cut/ }));
    expect(push).toHaveBeenCalledWith("/auctions/a1");
  });

  it("shows the current bid once there are bids, and the start of an upcoming auction", async () => {
    await inTheme(<AuctionTile a={{ ...auction, phase: "UPCOMING", bidsCount: 2, highestBidCents: 4200 }} />);
    expect(screen.getByText("Current bid")).toBeTruthy();
    expect(screen.getByText("$42.00")).toBeTruthy();
    expect(screen.getAllByText("Starts in").length).toBeGreaterThan(0);
  });

  it("has no clock once sold", async () => {
    await inTheme(<AuctionTile a={{ ...auction, phase: "SOLD", bidsCount: 2, highestBidCents: 4200 }} />);
    expect(screen.getByText("Sold for")).toBeTruthy();
    expect(screen.queryByRole("timer")).toBeNull();
  });
});
