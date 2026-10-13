import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { renderHook } from "@testing-library/react-native";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { pushPath, registerForPush, unregisterPush, useOpenTappedPush } from "@/lib/push";
import { resetStorage } from "@/test/storage";

/**
 * Push on the phone: the permission asked once, the token registered with Orochia (and forgotten at sign-out), and a
 * tapped notification opening its screen — while the app runs, and when the tap is what launched it (cold start).
 */
type Response = { notification: { request: { identifier: string; content: { data?: Record<string, unknown> } } } };
const notifications = {
  permission: { granted: false },
  asked: { granted: true },
  lastResponse: null as Response | null,
  listener: null as null | ((r: Response) => void),
};
const opened: string[] = [];
const apiCalls: { path: string; body: unknown; method?: string }[] = [];

jest.mock("expo-device", () => ({ isDevice: true }));
jest.mock("expo-constants", () => ({ __esModule: true, default: { expoConfig: { extra: { eas: { projectId: "project-1" } } } } }));
jest.mock("expo-notifications", () => ({
  AndroidImportance: { HIGH: 4 },
  setNotificationChannelAsync: jest.fn(async () => null),
  getPermissionsAsync: jest.fn(async () => notifications.permission),
  requestPermissionsAsync: jest.fn(async () => notifications.asked),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: "ExponentPushToken[device-1]" })),
  getLastNotificationResponse: jest.fn(() => notifications.lastResponse),
  addNotificationResponseReceivedListener: jest.fn((listener: (r: Response) => void) => {
    notifications.listener = listener;
    return { remove: () => (notifications.listener = null) };
  }),
}));
jest.mock("@/lib/api", () => ({
  api: jest.fn(async (path: string, init?: { method?: string; body?: unknown }) => {
    apiCalls.push({ path, method: init?.method, body: init?.body });
    return { success: true };
  }),
}));
jest.mock("@/lib/links", () => ({ openPath: (path: string) => opened.push(path) }));
jest.mock("@/lib/storage", () => jest.requireActual("@/test/storage"));


const tap = (identifier: string, path?: unknown) =>
  ({ notification: { request: { identifier, content: { data: path === undefined ? {} : { path } } } } }) as Response & Notifications.NotificationResponse;

beforeEach(() => {
  resetStorage();
  notifications.permission = { granted: false };
  notifications.asked = { granted: true };
  notifications.lastResponse = null;
  notifications.listener = null;
  opened.length = 0;
  apiCalls.length = 0;
  jest.clearAllMocks();
});

describe("registering the phone", () => {
  it("asks once, then registers the Expo token with Orochia (Android: the high-importance channel first)", async () => {
    Object.defineProperty(Platform, "OS", { value: "android", configurable: true });
    expect(await registerForPush()).toBe("ExponentPushToken[device-1]");
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith("default", expect.objectContaining({ importance: 4 }));
    expect(apiCalls).toEqual([{ path: "/api/me/devices", method: "POST", body: { token: "ExponentPushToken[device-1]", platform: "android" } }]);
    Object.defineProperty(Platform, "OS", { value: "ios", configurable: true });
  });

  it("does not ask again once granted", async () => {
    notifications.permission = { granted: true };
    await registerForPush();
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it("declined: no token, nothing sent — the app works the same", async () => {
    notifications.asked = { granted: false };
    expect(await registerForPush()).toBeNull();
    expect(apiCalls).toEqual([]);
  });

  it("sign-out forgets this phone on the server", async () => {
    await registerForPush();
    await unregisterPush();
    expect(apiCalls[1]).toEqual({ path: "/api/me/devices", method: "DELETE", body: { token: "ExponentPushToken[device-1]" } });
    apiCalls.length = 0;
    await unregisterPush();
    expect(apiCalls).toEqual([]); // nothing left to forget
  });
});

describe("a tapped notification", () => {
  it("reads only an Orochia path", () => {
    expect(pushPath(tap("a", "/messages?c=1"))).toBe("/messages?c=1");
    expect(pushPath(tap("b", "https://elsewhere.example"))).toBeNull();
    expect(pushPath(tap("c", 42))).toBeNull();
    expect(pushPath(tap("d"))).toBeNull();
  });

  it("opens its screen while the app runs", async () => {
    await renderHook(() => useOpenTappedPush());
    notifications.listener?.(tap("n1", "/auctions/0b9c1f2e-1111-4111-8111-111111111111"));
    expect(opened).toEqual(["/auctions/0b9c1f2e-1111-4111-8111-111111111111"]);
  });

  it("opens its screen when the tap launched the app (cold start), once", async () => {
    notifications.lastResponse = tap("n2", "/messages?c=0b9c1f2e-2222-4222-8222-222222222222");
    const { unmount } = await renderHook(() => useOpenTappedPush());
    expect(opened).toEqual(["/messages?c=0b9c1f2e-2222-4222-8222-222222222222"]);
    // The same response is still "the last one" after a remount, and the listener may echo it: still once.
    await unmount();
    await renderHook(() => useOpenTappedPush());
    notifications.listener?.(notifications.lastResponse);
    expect(opened).toHaveLength(1);
  });
});
