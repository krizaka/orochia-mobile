import { describe, expect, it } from "@jest/globals";
import { challengeRatio, TICKING } from "@/lib/challenge";

describe("challenge helpers", () => {
  it("fills the ring with the server's progress when it has one", () => {
    expect(challengeRatio({ progress: 0.42, pledgedCents: 99_999 })).toBe(0.42);
  });

  it("measures an open-ended pot against $100, capped at full", () => {
    expect(challengeRatio({ progress: null, pledgedCents: 2500 })).toBe(0.25);
    expect(challengeRatio({ progress: null, pledgedCents: 50_000 })).toBe(1);
  });

  it("ticks only while the pot is open", () => {
    expect(TICKING.has("FUNDING")).toBe(true);
    expect(TICKING.has("IN_PROGRESS")).toBe(false);
  });
});
