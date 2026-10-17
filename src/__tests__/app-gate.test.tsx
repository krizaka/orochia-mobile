import React from "react";
import { describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { ThemeProvider } from "@krizaka/ui/native";
import { decide } from "@krizaka/app-config/client";
import { AppGate } from "@/components/AppGate";

jest.mock("expo-secure-store", () => ({ getItemAsync: jest.fn(async () => null), setItemAsync: jest.fn(async () => undefined), deleteItemAsync: jest.fn(async () => undefined) }));

const payload = {
  platform: "ios" as const,
  minSupportedVersion: "1.2.0",
  latestVersion: "1.3.0",
  updateMode: "force" as const,
  storeUrl: null,
  maintenance: { on: false, message: null },
  contract: { min: 1, max: 1, sunset: null },
  flags: {},
  message: null,
  locale: "en",
};
const gate = async (decision: Parameters<typeof AppGate>[0]["decision"]) =>
  await render(
    <ThemeProvider>
      <AppGate decision={decision} onDismiss={() => undefined} onRetry={() => undefined}>
        <Text>the app</Text>
      </AppGate>
    </ThemeProvider>,
  );

describe("the app-version gate (krizaka/.github#75)", () => {
  it("shows the app when nothing is due", async () => {
    await gate({ kind: "ok" });
    expect(screen.getByText("the app")).toBeTruthy();
  });
  it("blocks the app with the update screen when the minimum is above the app's version", async () => {
    await gate(decide(payload));
    expect(screen.queryByText("the app")).toBeNull();
    expect(screen.getByText("Update Orochia to continue")).toBeTruthy();
  });
  it("keeps the app under a dismissible prompt for a soft update", async () => {
    await gate(decide({ ...payload, updateMode: "soft" }));
    expect(screen.getByText("the app")).toBeTruthy();
    expect(screen.getByText("An update is available")).toBeTruthy();
    expect(screen.getByText("Later")).toBeTruthy();
  });
  it("replaces the app with the maintenance screen and its message", async () => {
    await gate(decide({ ...payload, maintenance: { on: true, message: "Back at noon." } }));
    expect(screen.getByText("Orochia is under maintenance")).toBeTruthy();
    expect(screen.getByText("Back at noon.")).toBeTruthy();
  });
});
