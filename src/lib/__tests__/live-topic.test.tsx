import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook } from "@testing-library/react-native";
import { AppState } from "react-native";
import { useLiveTopic } from "@/lib/live-topic";
import { OROCHIA_URL } from "@/lib/config";

/** The live feed of one auction or challenge: opened while the screen is shown and the app in front, closed otherwise. */
type Listener = (e: { data?: string | null }) => void;
class MockSource {
  static all: MockSource[] = [];
  listeners = new Map<string, Listener[]>();
  closed = false;
  constructor(
    public url: string,
    public options: unknown,
  ) {
    MockSource.all.push(this);
  }
  addEventListener(type: string, listener: Listener) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }
  emit(type: string, data: string | null) {
    this.listeners.get(type)?.forEach((l) => l({ data }));
  }
  removeAllEventListeners() {
    this.listeners.clear();
  }
  close() {
    this.closed = true;
  }
}
// A plain constructor (not a jest.fn, which the preset resets between tests), resolved when the hook opens a stream.
jest.mock("react-native-sse", () => ({
  __esModule: true,
  default: function MockEventSource(url: string, options: unknown) {
    return new MockSource(url, options);
  },
}));


let appStateListener: ((s: string) => void) | null = null;
beforeEach(() => {
  MockSource.all = [];
  jest.spyOn(AppState, "addEventListener").mockImplementation(((_: string, l: (s: string) => void) => {
    appStateListener = l;
    return { remove: () => (appStateListener = null) };
  }) as never);
  Object.defineProperty(AppState, "currentState", { value: "active", configurable: true });
});

describe("useLiveTopic", () => {
  it("opens the topic's stream and hands over each event, `connected` included (the screen catches up)", async () => {
    const events: unknown[] = [];
    await renderHook(() => useLiveTopic("/api/auctions/a1/stream", (e) => events.push(e)));
    expect(MockSource.all).toHaveLength(1);
    expect(MockSource.all[0].url).toBe(`${OROCHIA_URL}/api/auctions/a1/stream`);
    await act(async () => {
      MockSource.all[0].emit("connected", '{"status":"connected"}');
      MockSource.all[0].emit("message", '{"type":"bid","highestBidCents":1200}');
      MockSource.all[0].emit("message", "not json");
    });
    expect(events).toEqual([{ type: "connected", status: "connected" }, { type: "bid", highestBidCents: 1200 }]);
  });

  it("opens nothing without a topic (the auction is closed, the screen still loading)", async () => {
    await renderHook(() => useLiveTopic(null, () => undefined));
    expect(MockSource.all).toHaveLength(0);
  });

  it("closes in the background, reopens in front", async () => {
    await renderHook(() => useLiveTopic("/api/challenges/c1/stream", () => undefined));
    await act(async () => appStateListener?.("background"));
    expect(MockSource.all[0].closed).toBe(true);
    await act(async () => appStateListener?.("active"));
    expect(MockSource.all).toHaveLength(2);
    expect(MockSource.all[1].closed).toBe(false);
  });

  it("closes when the screen goes", async () => {
    const { unmount } = await renderHook(() => useLiveTopic("/api/challenges/c1/stream", () => undefined));
    await unmount();
    expect(MockSource.all[0].closed).toBe(true);
  });
});
