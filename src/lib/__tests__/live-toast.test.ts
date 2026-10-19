import { describe, expect, it, jest } from "@jest/globals";
import { toastsMessage } from "@/lib/live";

jest.mock("react-native-sse", () => ({ __esModule: true, default: function MockEventSource() {} }));
jest.mock("lucide-react-native", () => new Proxy({}, { get: () => () => null }));
jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));

const message = { conversationId: "c1", content: "Doors at 8" };
const elsewhere = { onMessagesTab: false, viewing: null };

describe("a message heard on the account's stream", () => {
  it("toasts when neither Messages nor its conversation is on screen", () => {
    expect(toastsMessage(message, elsewhere)).toBe(true);
  });

  it("arrives in place, without a toast, on Messages or in its conversation", () => {
    expect(toastsMessage(message, { onMessagesTab: true, viewing: null })).toBe(false);
    expect(toastsMessage(message, { onMessagesTab: false, viewing: "c1" })).toBe(false);
    expect(toastsMessage(message, { onMessagesTab: false, viewing: "c2" })).toBe(true);
  });

  it("never toasts a message already read — a reconnection replays them", () => {
    expect(toastsMessage({ ...message, isRead: true }, elsewhere)).toBe(false);
    expect(toastsMessage({ ...message, readAt: "2026-10-13T04:10:00.000Z" }, elsewhere)).toBe(false);
  });
});
