import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { ThemeProvider } from "@krizaka/ui/native";
import { nativeTheme } from "@krizaka/orochia-design-system/tokens";
import NotificationSettings from "@/app/settings/notifications";
import { NOTIFICATION_GROUPS } from "@/lib/notification-prefs";
import { saveToken } from "@/lib/session";
import { answerFetch } from "@/test/api";
import { resetStorage } from "@/test/storage";

const phone = { granted: true };
jest.mock("expo-notifications", () => ({ getPermissionsAsync: jest.fn(async () => phone) }));
jest.mock("lucide-react-native", () => new Proxy({}, { get: () => () => null }));
jest.mock("@/lib/storage", () => jest.requireActual("@/test/storage"));

const show = () =>
  render(
    <ThemeProvider overrides={nativeTheme}>
      <NotificationSettings />
    </ThemeProvider>,
  );

beforeEach(async () => {
  resetStorage();
  phone.granted = true;
  await saveToken("native-session");
});

describe("Notification settings (orochia://settings/notifications)", () => {
  it("shows one switch per kind, as the account has them", async () => {
    answerFetch({ "/api/me/profile": { profile: { inAppOff: ["newComment"] } } });
    await show();
    await waitFor(() => expect(screen.getByLabelText("Auctions")).toBeTruthy());
    expect(screen.getByLabelText("Auctions").props.value).toBe(true);
    expect(screen.getByLabelText("Comments").props.value).toBe(false);
  });

  it("turning a kind off saves its events at once, the others untouched", async () => {
    const { calls } = answerFetch({ "/api/me/profile": { profile: { inAppOff: ["newComment"] } } });
    await show();
    await waitFor(() => expect(screen.getByLabelText("Auctions")).toBeTruthy());
    fireEvent(screen.getByLabelText("Auctions"), "valueChange", false);
    await waitFor(() => expect(calls.some((c) => c.method === "PUT")).toBe(true));
    const put = calls.find((c) => c.method === "PUT")!;
    expect(put.path).toBe("/api/me/profile");
    expect((put.body as { inAppOff: string[] }).inAppOff).toEqual([...NOTIFICATION_GROUPS.auctions, "newComment"].sort());
    expect(put.headers.Authorization).toBe("Bearer native-session");
    expect(screen.getByLabelText("Auctions").props.value).toBe(false);
  });

  it("a refused save puts the switch back and says why", async () => {
    answerFetch({ "/api/me/profile": { profile: { inAppOff: [] } } });
    await show();
    await waitFor(() => expect(screen.getByLabelText("Messages")).toBeTruthy());
    answerFetch({ "/api/me/profile": { status: 500, body: { error: "Down" } } });
    fireEvent(screen.getByLabelText("Messages"), "valueChange", false);
    await waitFor(() => expect(screen.getByLabelText("Messages").props.value).toBe(true));
  });

  it("when the phone refuses Orochia's notifications, says so first, with the way to the settings", async () => {
    phone.granted = false;
    answerFetch({ "/api/me/profile": { profile: { inAppOff: [] } } });
    await show();
    await waitFor(() => expect(screen.getByText("Notifications are off for Orochia on this phone")).toBeTruthy());
    expect(screen.getByText("Open the phone settings")).toBeTruthy();
  });
});
