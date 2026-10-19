import { describe, expect, it } from "@jest/globals";
import { aiCreditOf, aspectLabel, clock, qualityLabel, shortRunId } from "@/lib/video-info";

const RUN = "6351addc-1f2e-4b7a-9c3d-0123456789ab";

describe("the quiet line under a video (orochia-mobile#55: the same facts as the web)", () => {
  it("names the shape of the picture", () => {
    expect(aspectLabel(1080, 1920)).toBe("9:16");
    expect(aspectLabel(1920, 1080)).toBe("16:9");
    expect(aspectLabel(1000, 1000)).toBe("1:1");
    expect(aspectLabel(null, 1080)).toBeNull();
  });

  it("labels quality only above HD, from the short side, with the web's thresholds", () => {
    expect(qualityLabel(1080, 1920)).toBe("Full HD 1080p");
    expect(qualityLabel(1072, 1920)).toBe("Full HD 1080p");
    expect(qualityLabel(1440, 2560)).toBe("QHD 1440p");
    expect(qualityLabel(2160, 3840)).toBe("4K");
    expect(qualityLabel(720, 1280)).toBeNull(); // 720p is never sold as HD
    expect(qualityLabel(null, null)).toBeNull();
  });

  it("writes a duration as m:ss", () => {
    expect(clock(32)).toBe("0:32");
    expect(clock(605)).toBe("10:05");
  });
});

describe("the AI credit: the stored provenance first, the description line for older videos", () => {
  it("reads the provenance field", () => {
    expect(aiCreditOf({ aiProvenance: { generator: "orazaka", runId: RUN, model: "Wan 2.2", hardware: "H100" }, description: "x" })).toEqual({ runId: RUN, model: "Wan 2.2", hardware: "H100" });
  });
  it("falls back to « Made with Orazaka — run … (model on hardware) » in the description", () => {
    expect(aiCreditOf({ description: `A glide.\n\nMade with Orazaka — run ${RUN} (wan2.2 on NVIDIA H100).` })).toEqual({ runId: RUN, model: "wan2.2", hardware: "NVIDIA H100" });
    expect(aiCreditOf({ description: "Made with Orazaka · run abcdef12 (Wan 2.2 A14B)." })).toEqual({ runId: "abcdef12", model: "Wan 2.2 A14B", hardware: null });
  });
  it("is null for a human video", () => {
    expect(aiCreditOf({ description: "My morning run." })).toBeNull();
    expect(aiCreditOf({})).toBeNull();
  });
  it("shortens a run id to its first group", () => {
    expect(shortRunId(RUN)).toBe("6351addc…");
    expect(shortRunId("abcdef12")).toBe("abcdef12");
  });
});
