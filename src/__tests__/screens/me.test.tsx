import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { ThemeProvider } from "@krizaka/ui/native";
import { nativeTheme } from "@krizaka/orochia-design-system/tokens";
import Me from "@/app/(tabs)/me";
import { AuthProvider } from "@/lib/auth";
import { clearToken, readToken, saveToken } from "@/lib/session";
import { answerFetch } from "@/test/api";
import { resetStorage } from "@/test/storage";
import meSeed from "@/__fixtures__/api/auth-me.local-seed.json";
import walletSeed from "@/__fixtures__/api/me-wallet.local-seed.json";
import notificationsSeed from "@/__fixtures__/api/me-notifications.local-seed.json";

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
jest.mock("lucide-react-native", () => new Proxy({}, { get: () => () => null }));
jest.mock("react-native-safe-area-context", () => (jest.requireActual("react-native-safe-area-context/jest/mock") as { default: unknown }).default);
jest.mock("expo-web-browser", () => ({ openBrowserAsync: jest.fn() }));
jest.mock("@/lib/storage", () => jest.requireActual("@/test/storage"));
// Push needs a device and an EAS project; the live stream an open SSE connection — neither is the subject here.
jest.mock("@/lib/push", () => ({ registerForPush: jest.fn(async () => null), unregisterPush: jest.fn(async () => undefined) }));
jest.mock("@/lib/live", () => ({ useLive: () => ({ markSeen: () => undefined, unread: 0, messagesUnread: 0 }) }));

const show = () =>
  render(
    <ThemeProvider overrides={nativeTheme}>
      <AuthProvider>
        <Me />
      </AuthProvider>
    </ThemeProvider>,
  );

const signedIn = { "/api/auth/me": meSeed, "/api/me/wallet": walletSeed, "/api/me/notifications": notificationsSeed };

beforeEach(async () => {
  resetStorage();
  await clearToken();
});

describe("You (the account tab)", () => {
  it("signs in as a native client, keeps the session token and shows the account", async () => {
    const { calls } = answerFetch({ "/api/auth/login": { success: true, emailVerified: true, token: "recorded-session", expiresIn: 2592000 }, ...signedIn });
    await show();
    await fireEvent.changeText(await screen.findByPlaceholderText("E-mail or username"), "  alex@sanctuary.io ");
    await fireEvent.changeText(screen.getByPlaceholderText("Password"), "secret");
    await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Alex Vance")).toBeTruthy();
    expect(screen.getByText("@alex_vance")).toBeTruthy();
    expect(screen.getByText("$0.00")).toBeTruthy();
    expect(screen.getByText("Nothing new.")).toBeTruthy();

    const login = calls.find((c) => c.path === "/api/auth/login");
    expect(login?.method).toBe("POST");
    expect(login?.body).toEqual({ identifier: "alex@sanctuary.io", password: "secret", client: "native" });
    expect(await readToken()).toBe("recorded-session");
    const me = calls.find((c) => c.path === "/api/auth/me");
    expect(me?.headers.Authorization).toBe("Bearer recorded-session");
  });

  it("says the credentials are wrong on a 401, and keeps no session", async () => {
    answerFetch({ "/api/auth/login": { status: 401, body: { success: false, error: "Invalid credentials" } } });
    await show();
    await fireEvent.changeText(await screen.findByPlaceholderText("E-mail or username"), "alex_vance");
    await fireEvent.changeText(screen.getByPlaceholderText("Password"), "wrong");
    await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Wrong e-mail, username or password.")).toBeTruthy();
    expect(await readToken()).toBeNull();
  });

  it("asks to confirm the e-mail first when the account is not verified", async () => {
    answerFetch({ "/api/auth/login": { success: true, emailVerified: false, token: "t", expiresIn: 1 } });
    await show();
    await fireEvent.changeText(await screen.findByPlaceholderText("E-mail or username"), "new@example.com");
    await fireEvent.changeText(screen.getByPlaceholderText("Password"), "pw");
    await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Confirm your e-mail first — the link is in your inbox.")).toBeTruthy();
    expect(await readToken()).toBeNull();
  });

  it("opens on the account when a stored session is still accepted, and signs out", async () => {
    await saveToken("stored-session");
    answerFetch(signedIn);
    await show();
    expect(await screen.findByText("Alex Vance")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Sign out" }));
    expect(await screen.findByRole("button", { name: "Sign in" })).toBeTruthy();
    expect(await readToken()).toBeNull();
  });

  it("drops a stored session the server no longer accepts", async () => {
    await saveToken("expired-session");
    answerFetch({ "/api/auth/me": { status: 401, body: { error: "Unauthorized" } } });
    await show();
    expect(await screen.findByRole("button", { name: "Sign in" })).toBeTruthy();
    expect(await readToken()).toBeNull();
  });
});
