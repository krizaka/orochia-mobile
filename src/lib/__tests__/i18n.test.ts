import { describe, expect, it } from "@jest/globals";
import { t, usd } from "@/i18n";
import { absoluteUrl } from "@/lib/config";

describe("words and URLs", () => {
  it("fills variables and formats money", () => {
    expect(t("challenge.backers", { count: 3 })).toBe("Backers · 3");
    expect(usd(1250)).toBe("$12.50");
  });

  it("answers the key itself for a missing message instead of crashing", () => {
    expect(t("nope.missing" as never)).toBe("nope.missing");
  });

  it("puts relative media on the Orochia host and keeps absolute ones", () => {
    expect(absoluteUrl("/defaults/avatars/avatar-01.svg")).toMatch(/^https?:\/\/[^/]+\/defaults\/avatars\/avatar-01\.svg$/);
    expect(absoluteUrl("https://cdn.example.com/a.jpg")).toBe("https://cdn.example.com/a.jpg");
    expect(absoluteUrl(null)).toBeNull();
  });
});
