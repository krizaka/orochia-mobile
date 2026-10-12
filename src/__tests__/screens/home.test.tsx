import React from "react";
import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { ThemeProvider } from "@krizaka/ui/native";
import { nativeTheme } from "@krizaka/orochia-design-system/tokens";
import Home from "@/app/(tabs)/index";
import { answerFetch } from "@/test/api";
import feedSeed from "@/__fixtures__/api/feed.local-seed.json";
import storiesSeed from "@/__fixtures__/api/stories.local-seed.json";
import feedEmpty from "@/__fixtures__/api/feed.dev-empty.json";
import storiesEmpty from "@/__fixtures__/api/stories.dev-empty.json";

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
jest.mock("lucide-react-native", () => new Proxy({}, { get: () => () => null }));
jest.mock("react-native-safe-area-context", () => (jest.requireActual("react-native-safe-area-context/jest/mock") as { default: unknown }).default);
jest.mock("expo-video", () => ({ useVideoPlayer: () => ({ addListener: () => ({ remove: () => undefined }) }), VideoView: () => null }));
jest.mock("@/lib/storage", () => jest.requireActual("@/test/storage"));

const show = () => render(<ThemeProvider overrides={nativeTheme}><Home /></ThemeProvider>);

describe("Home", () => {
  it("shows the stories rail and the feed the API answers (local Orochia, development seed)", async () => {
    answerFetch({ "/api/feed": feedSeed, "/api/stories": storiesSeed });
    await show();
    expect(await screen.findByText("Midnight Noir — Acoustic Lounge Session")).toBeTruthy();
    expect(screen.getByText("Trending now")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Rehearsal Tapes — Contacts Only" })).toBeTruthy();
    // One ring per creator with stories, named for screen readers.
    expect(screen.getByRole("button", { name: "Elena Vox" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mia Sterling" })).toBeTruthy();
    expect(screen.queryByTestId("feed-skeleton")).toBeNull();
  });

  it("opens a creator's stories full screen from their ring, marks the story viewed, and closes", async () => {
    const { calls } = answerFetch({ "/api/feed": feedSeed, "/api/stories": storiesSeed, "/api/stories/": { success: true } });
    await show();
    const mia = storiesSeed.rings[1];
    await fireEvent.press(await screen.findByRole("button", { name: mia.displayName }));
    expect(await screen.findByText(mia.stories[0].caption as string)).toBeTruthy();
    expect(calls.some((c) => c.method === "POST" && c.path === `/api/stories/${mia.stories[0].id}/view`)).toBe(true);
    await fireEvent.press(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByText(mia.stories[0].caption as string)).toBeNull();
  });

  it("says the first videos are on their way when the feed is empty (dev.orochia.com today), with no rail", async () => {
    answerFetch({ "/api/feed": feedEmpty, "/api/stories": storiesEmpty });
    await show();
    expect(await screen.findByText("The first videos are on their way")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Elena Vox" })).toBeNull();
  });

  it("says Orochia is out of reach when the API cannot be reached", async () => {
    answerFetch({});
    await show();
    expect(await screen.findByText("Orochia is out of reach. Pull to try again.")).toBeTruthy();
  });
});
