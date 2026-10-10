import { describe, expect, it } from "@jest/globals";
import { clockSkew, countdownUnits } from "@/lib/countdown";

describe("countdown helpers", () => {
  it("measures the server's clock against the device's", () => {
    const device = Date.parse("2026-10-09T10:00:00.000Z");
    expect(clockSkew("2026-10-09T10:02:00.000Z", device)).toBe(120_000);
    expect(clockSkew(undefined, device)).toBe(0);
    expect(clockSkew("not a date", device)).toBe(0);
  });

  it("reads the unit letters from the messages", () => {
    expect(countdownUnits()).toEqual({ d: "d", h: "h", m: "m", s: "s" });
  });
});
