import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { ThemeProvider } from "@krizaka/ui/native";
import { nativeTheme } from "@krizaka/orochia-design-system/tokens";
import { router } from "expo-router";
import SignUp from "@/app/auth/sign-up";
import { AuthProvider } from "@/lib/auth";
import { clearToken, readToken } from "@/lib/session";
import { resetDeviceCache } from "@/lib/signup";
import { answerFetch, type Call } from "@/test/api";
import { resetStorage } from "@/test/storage";

jest.mock("expo-router", () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) }, Redirect: () => null }));
jest.mock("lucide-react-native", () => new Proxy({}, { get: () => () => null }));
jest.mock("react-native-safe-area-context", () => (jest.requireActual("react-native-safe-area-context/jest/mock") as { default: unknown }).default);
jest.mock("expo-web-browser", () => ({ openBrowserAsync: jest.fn() }));
jest.mock("@/lib/storage", () => jest.requireActual("@/test/storage"));
jest.mock("@/lib/push", () => ({ registerForPush: jest.fn(async () => null), unregisterPush: jest.fn(async () => undefined) }));
// The bot challenge is a WebView of the server's page: here, a stand-in the test can make answer.
const challenge: { send?: (data: string) => void } = {};
jest.mock("react-native-webview", () => {
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  return {
    WebView: (props: { onMessage: (e: { nativeEvent: { data: string } }) => void; testID?: string }) => {
      challenge.send = (data) => props.onMessage({ nativeEvent: { data } });
      return <View testID={props.testID} />;
    },
  };
});

const show = () =>
  render(
    <ThemeProvider overrides={nativeTheme}>
      <AuthProvider>
        <SignUp />
      </AuthProvider>
    </ThemeProvider>,
  );

const pendingUser = { id: "u1", username: "eric_m", email: "eric@example.com", role: "MEMBER", displayName: "Eric", emailVerified: false };
const formOpen = { success: true, formToken: "v1.1791820841504.sig", challenge: null };
const free = { success: true, available: true };

/** The sign-up API as the server answers it: the form (GET), the account (POST), and the given /api/auth/me. */
function server(post: (call: Call) => unknown, extra: Record<string, unknown> = {}) {
  return answerFetch({
    "/api/auth/register": (call: Call) => (call.method === "GET" ? formOpen : post(call)),
    "/api/auth/username": free,
    "/api/auth/me": { user: null },
    ...extra,
  });
}

async function fill({ day = "12", month = "04", year = "1990" } = {}) {
  await fireEvent.changeText(await screen.findByLabelText("E-mail"), "eric@example.com");
  await fireEvent.changeText(screen.getByLabelText("Username"), "eric_m");
  await fireEvent.changeText(screen.getByLabelText("Password"), "a-long-password-1");
  await fireEvent.changeText(screen.getByLabelText("Day of birth"), day);
  await fireEvent.changeText(screen.getByLabelText("Month of birth"), month);
  await fireEvent.changeText(screen.getByLabelText("Year of birth"), year);
}
const tick = async (name: string) => fireEvent.press(screen.getByRole("checkbox", { name }));
const submitButton = () => screen.getByRole("button", { name: "Create account" });

beforeEach(async () => {
  resetStorage();
  resetDeviceCache();
  await clearToken();
  jest.mocked(router.replace).mockClear();
});

describe("Create an account", () => {
  it("keeps the button off until everything the server needs is there", async () => {
    server(() => ({ status: 500, body: {} }));
    await show();
    await fill();
    expect(submitButton()).toBeDisabled();
    await tick("I am at least 18 years old.");
    expect(submitButton()).toBeDisabled();
    await tick("I accept the Terms of Service and the Privacy Policy.");
    expect(submitButton()).toBeEnabled();
  });

  it("shows the password rule and the date of birth's privacy", async () => {
    server(() => ({ status: 500, body: {} }));
    await show();
    expect(await screen.findAllByText("At least 10 characters")).toBeTruthy();
    expect(screen.getByText("Private — never shown on your profile. Orochia is for adults only.")).toBeTruthy();
  });

  it("refuses a minor clearly, and never sends the form", async () => {
    const { calls } = server(() => ({ status: 201, body: { token: "x" } }));
    await show();
    const year = String(new Date().getFullYear() - 16);
    await fill({ year });
    await tick("I am at least 18 years old.");
    await tick("I accept the Terms of Service and the Privacy Policy.");
    expect(screen.getByText("Orochia is for adults only")).toBeTruthy();
    expect(screen.getByText("You must be 18 or older (or the age of majority where you live) to create an account.")).toBeTruthy();
    expect(submitButton()).toBeDisabled();
    expect(calls.some((c) => c.method === "POST")).toBe(false);
  });

  it("puts the server's 18+ refusal on the date of birth (the server decides)", async () => {
    server(() => ({ status: 403, body: { success: false, error: "Orochia is for adults only: you must be 18 or older.", code: "UNDERAGE" } }));
    await show();
    await fill();
    await tick("I am at least 18 years old.");
    await tick("I accept the Terms of Service and the Privacy Policy.");
    await fireEvent.press(submitButton());
    expect(await screen.findByText("Orochia is for adults only: you must be 18 or older.")).toBeTruthy();
    expect(await readToken()).toBeNull();
  });

  it("checks the username as it is typed, and offers the free one the server suggests", async () => {
    const { calls } = answerFetch({
      "/api/auth/register": formOpen,
      "/api/auth/me": { user: null },
      "/api/auth/username": (call: Call) =>
        call.path.endsWith("=alex_vance") ? { success: true, available: false, reason: "taken", suggestion: "alex_vance2" } : { success: true, available: true },
    });
    await show();
    await fireEvent.changeText(await screen.findByLabelText("Username"), "alex");
    await fireEvent.changeText(screen.getByLabelText("Username"), "alex_vance");
    expect(await screen.findByText("Taken — try @alex_vance2", {}, { timeout: 3000 })).toBeTruthy();
    // Debounced: the half-typed "alex" was never asked.
    expect(calls.filter((c) => c.path.startsWith("/api/auth/username")).map((c) => c.path)).toEqual(["/api/auth/username?username=alex_vance"]);
    await fireEvent.press(screen.getByRole("button", { name: "Use @alex_vance2" }));
    expect(await screen.findByText("Available — your address: orochia.com/@alex_vance2", {}, { timeout: 3000 })).toBeTruthy();
  });

  it("maps the server's validation errors to their fields", async () => {
    server(() => ({
      status: 400,
      body: { success: false, error: "Invalid payload", details: { formErrors: [], fieldErrors: { email: ["Invalid email"], password: ["At least 10 characters"] } } },
    }));
    await show();
    await fill();
    await tick("I am at least 18 years old.");
    await tick("I accept the Terms of Service and the Privacy Policy.");
    await fireEvent.press(submitButton());
    expect(await screen.findByText("Enter a valid e-mail address.")).toBeTruthy();
    expect(screen.getByText("Choose a password of at least 10 characters.")).toBeTruthy();
  });

  it("says an anti-bot refusal above the button and asks for a new form", async () => {
    const { calls } = server(() => ({ status: 400, body: { success: false, error: "Please try again.", code: "FORM_TOO_FAST" } }));
    await show();
    await fill();
    await tick("I am at least 18 years old.");
    await tick("I accept the Terms of Service and the Privacy Policy.");
    await fireEvent.press(submitButton());
    expect(await screen.findByText("Please try again.")).toBeTruthy();
    expect(calls.filter((c) => c.method === "GET" && c.path.startsWith("/api/auth/register")).length).toBe(2);
  });

  it("waits for the bot challenge when the server asks for one, and sends its token", async () => {
    const posts: Call[] = [];
    answerFetch({
      "/api/auth/register": (call: Call) => {
        if (call.method === "GET") return { ...formOpen, challenge: { provider: "turnstile", siteKey: "0x4AAA" } };
        posts.push(call);
        return { status: 201, body: { success: true, verificationRequired: true, token: "new-session" } };
      },
      "/api/auth/username": free,
      "/api/auth/me": { user: pendingUser },
    });
    await show();
    await fill();
    await tick("I am at least 18 years old.");
    await tick("I accept the Terms of Service and the Privacy Policy.");
    expect(await screen.findByTestId("bot-challenge")).toBeTruthy();
    expect(submitButton()).toBeDisabled();
    await act(async () => challenge.send?.(JSON.stringify({ type: "challenge", token: "turnstile-ok" })));
    expect(submitButton()).toBeEnabled();
    await fireEvent.press(submitButton());
    expect(await screen.findByText("Check your inbox")).toBeTruthy();
    expect((posts[0].body as { challengeToken: string }).challengeToken).toBe("turnstile-ok");
  });

  it("creates the account, keeps the session, asks for the e-mail, then goes home signed in", async () => {
    let verified = false;
    const { calls } = server(() => ({ status: 201, body: { success: true, verificationRequired: true, token: "new-session", expiresIn: 604800 } }), {
      "/api/auth/me": () => (verified ? { user: { ...pendingUser, emailVerified: true }, token: "verified-session" } : { user: pendingUser }),
    });
    await show();
    await fill();
    await tick("I am at least 18 years old.");
    await tick("I accept the Terms of Service and the Privacy Policy.");
    await fireEvent.press(submitButton());

    expect(await screen.findByText("Check your inbox")).toBeTruthy();
    expect(screen.getByText("We sent a link to eric@example.com. Open it to confirm your address — then come back here.")).toBeTruthy();
    expect(await readToken()).toBe("new-session");
    const post = calls.find((c) => c.method === "POST" && c.path === "/api/auth/register");
    expect(post?.body).toMatchObject({ email: "eric@example.com", username: "eric_m", dateOfBirth: "1990-04-12", isAgeVerified: true, acceptTerms: true, client: "native", formToken: formOpen.formToken });

    await fireEvent.press(screen.getByRole("button", { name: "I've confirmed it" }));
    expect(await screen.findByText("Not confirmed yet — open the link in the e-mail, then try again.")).toBeTruthy();

    verified = true;
    await fireEvent.press(screen.getByRole("button", { name: "I've confirmed it" }));
    await act(async () => undefined);
    expect(router.replace).toHaveBeenCalledWith("/");
    // The server refreshed the session once the address was verified: the app keeps the new token.
    expect(await readToken()).toBe("verified-session");
  });

  it("shows the Orochia mark and the wait in words while the account is being created", async () => {
    server(() => ({ status: 201, body: { success: true, token: "s" } }));
    const answered = global.fetch;
    // The server takes its time: the POST stays pending.
    global.fetch = ((input: unknown, init?: { method?: string }) => (init?.method === "POST" ? new Promise(() => undefined) : answered(input as string, init as RequestInit))) as typeof fetch;
    await show();
    await fill();
    await tick("I am at least 18 years old.");
    await tick("I accept the Terms of Service and the Privacy Policy.");
    expect(screen.queryByRole("progressbar", { name: "Creating your account…" })).toBeNull();
    await fireEvent.press(submitButton());
    expect(await screen.findByRole("progressbar", { name: "Creating your account…" })).toBeTruthy();
  });

  it("sends the link again from the verification step", async () => {
    const { calls } = server(() => ({ status: 201, body: { success: true, token: "new-session" } }), {
      "/api/auth/me": { user: pendingUser },
      "/api/auth/resend-verification": { success: true },
    });
    await show();
    await fill();
    await tick("I am at least 18 years old.");
    await tick("I accept the Terms of Service and the Privacy Policy.");
    await fireEvent.press(submitButton());
    await fireEvent.press(await screen.findByRole("button", { name: "Send the link again" }));
    expect(await screen.findByText("A new link is on its way. The previous one no longer works.")).toBeTruthy();
    expect(calls.find((c) => c.path === "/api/auth/resend-verification")?.headers.Authorization).toBe("Bearer new-session");
  });
});
