import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { ThemeProvider } from "@krizaka/ui/native";
import { nativeTheme } from "@krizaka/orochia-design-system/tokens";
import Home from "@/app/(tabs)/index";
import Me from "@/app/(tabs)/me";
import Messages from "@/app/(tabs)/messages";
import Auctions from "@/app/(tabs)/auctions";
import Challenges from "@/app/(tabs)/challenges";
import SignUp from "@/app/auth/sign-up";
import Watch from "@/app/watch/[id]";
import NotificationSettings from "@/app/settings/notifications";
import { AgeGate } from "@/components/AgeGate";
import { AuthProvider } from "@/lib/auth";
import { clearToken, saveToken } from "@/lib/session";
import { resetDeviceCache } from "@/lib/signup";
import { answerFetch } from "@/test/api";
import { a11yProblems } from "@/test/a11y";
import { resetStorage } from "@/test/storage";
import feedSeed from "@/__fixtures__/api/feed.local-seed.json";
import storiesSeed from "@/__fixtures__/api/stories.local-seed.json";
import feedEmpty from "@/__fixtures__/api/feed.dev-empty.json";
import storiesEmpty from "@/__fixtures__/api/stories.dev-empty.json";
import meSeed from "@/__fixtures__/api/auth-me.local-seed.json";
import walletSeed from "@/__fixtures__/api/me-wallet.local-seed.json";
import notificationsSeed from "@/__fixtures__/api/me-notifications.local-seed.json";

/**
 * Accessibility of the key screens (krizaka/orochia#130, WCAG 2.2 AA): every screen, in the states a person meets
 * (filled, empty, out of reach, signed out and in), names and roles what can be pressed, keeps press targets at 44 pt,
 * follows the system's font size and names its images — src/test/a11y.ts.
 */
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  Redirect: () => null,
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ id: "54dce115-d41a-46ef-864f-89fe2faac922" }),
  useFocusEffect: () => undefined,
}));
jest.mock("lucide-react-native", () => new Proxy({}, { get: () => () => null }));
jest.mock("react-native-safe-area-context", () => (jest.requireActual("react-native-safe-area-context/jest/mock") as { default: unknown }).default);
jest.mock("expo-web-browser", () => ({ openBrowserAsync: jest.fn() }));
jest.mock("expo-video", () => ({ useVideoPlayer: () => ({ addListener: () => ({ remove: () => undefined }) }), VideoView: () => null }));
jest.mock("expo-notifications", () => ({ getPermissionsAsync: jest.fn(async () => ({ granted: true })) }));
jest.mock("react-native-webview", () => ({ WebView: () => null }));
jest.mock("@/lib/storage", () => jest.requireActual("@/test/storage"));
jest.mock("@/lib/push", () => ({ registerForPush: jest.fn(async () => null), unregisterPush: jest.fn(async () => undefined) }));
jest.mock("@/lib/live", () => ({
  useLive: () => ({ markSeen: () => undefined, unread: 0, messagesUnread: 0 }),
  useLiveEvents: () => undefined,
  setOnMessagesTab: () => undefined,
  setViewingConversation: () => undefined,
}));
jest.mock("@/lib/live-topic", () => ({ useLiveTopic: () => undefined }));

const themed = (node: React.ReactElement) => render(<ThemeProvider overrides={nativeTheme}><AuthProvider>{node}</AuthProvider></ThemeProvider>);
const signedIn = { "/api/auth/me": meSeed, "/api/me/wallet": walletSeed, "/api/me/notifications": notificationsSeed };

beforeEach(async () => {
  resetStorage();
  resetDeviceCache();
  await clearToken();
});

describe("Accessibility of the key screens", () => {
  it("the 18+ gate", async () => {
    await themed(<AgeGate onConfirm={() => undefined} />);
    expect(screen.getByRole("button", { name: "I am 18 or older — enter" })).toBeTruthy();
    expect(a11yProblems()).toEqual([]);
  });

  it("sign-in (the account tab, signed out)", async () => {
    answerFetch({ "/api/auth/me": { user: null } });
    await themed(<Me />);
    await screen.findByPlaceholderText("E-mail or username");
    expect(a11yProblems()).toEqual([]);
  });

  it("the account tab, signed in", async () => {
    await saveToken("recorded-session");
    answerFetch(signedIn);
    await themed(<Me />);
    await screen.findByText("Alex Vance");
    expect(a11yProblems()).toEqual([]);
  });

  it("sign-up", async () => {
    answerFetch({ "/api/auth/register": { success: true, formToken: "v1.1791820841504.sig", challenge: null }, "/api/auth/me": { user: null } });
    await themed(<SignUp />);
    await screen.findByLabelText("E-mail");
    expect(a11yProblems()).toEqual([]);
  });

  it("notification settings", async () => {
    await saveToken("native-session");
    answerFetch({ "/api/me/profile": { profile: { inAppOff: [] } }, ...signedIn });
    await themed(<NotificationSettings />);
    await screen.findByLabelText("Auctions");
    expect(a11yProblems()).toEqual([]);
  });

  it("home — the feed and the stories rail", async () => {
    answerFetch({ "/api/feed": feedSeed, "/api/stories": storiesSeed });
    await themed(<Home />);
    await screen.findByText("Midnight Noir — Acoustic Lounge Session");
    expect(a11yProblems()).toEqual([]);
  });

  it("home — a story open full screen", async () => {
    answerFetch({ "/api/feed": feedSeed, "/api/stories": storiesSeed, "/api/stories/": { success: true } });
    await themed(<Home />);
    await fireEvent.press(await screen.findByRole("button", { name: storiesSeed.rings[1].displayName }));
    await screen.findByText(storiesSeed.rings[1].stories[0].caption as string);
    expect(a11yProblems()).toEqual([]);
  });

  it("home — empty, and out of reach", async () => {
    answerFetch({ "/api/feed": feedEmpty, "/api/stories": storiesEmpty });
    const empty = await themed(<Home />);
    await screen.findByText("The first videos are on their way");
    expect(a11yProblems()).toEqual([]);
    empty.unmount();
    answerFetch({});
    await themed(<Home />);
    await screen.findByText("Orochia is out of reach. Pull to try again.");
    expect(a11yProblems()).toEqual([]);
  });

  it.each([
    ["messages", Messages],
    ["auctions", Auctions],
    ["challenges", Challenges],
    ["watch", Watch],
  ])("%s — what shows when the API cannot be reached", async (_name, Screen) => {
    await saveToken("recorded-session");
    answerFetch({ "/api/auth/me": meSeed });
    await themed(<Screen />);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(a11yProblems()).toEqual([]);
  });
});
