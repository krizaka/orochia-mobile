import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { ThemeProvider } from "@krizaka/ui/native";
import { nativeTheme } from "@krizaka/orochia-design-system/tokens";
import { VideoInfo } from "@/components/VideoInfo";
import { setLocale } from "@/i18n";
import { a11yProblems } from "@/test/a11y";

/** The quiet line and the AI badge under a video (orochia-mobile#55): the same facts as the web watch page. */
jest.mock("lucide-react-native", () => new Proxy({}, { get: () => () => null }));

const RUN = "6351addc-1f2e-4b7a-9c3d-0123456789ab";
const base = { width: 1080, height: 1920, framerate: 24, durationSeconds: 32, createdAt: "2026-10-16T12:00:00Z", description: "A glide." };
const themed = (node: React.ReactElement) => render(<ThemeProvider overrides={nativeTheme}>{node}</ThemeProvider>);

beforeEach(() => setLocale("en"));

describe("the video information", () => {
  it("is one quiet line: quality · shape · length · frame rate · date", async () => {
    await themed(<VideoInfo video={base} />);
    expect(screen.getByText("Full HD 1080p · 9:16 · 0:32 · 24 fps · Oct 16, 2026")).toBeTruthy();
    expect(screen.queryByText("AI-generated")).toBeNull();
    expect(a11yProblems()).toEqual([]);
  });

  it("wears an AI badge from the stored provenance, and opens how the clip was made", async () => {
    await themed(<VideoInfo video={{ ...base, aiProvenance: { generator: "orazaka", runId: RUN, model: "Wan 2.2 A14B", hardware: "NVIDIA H100" } }} />);
    expect(screen.getByText("AI-generated")).toBeTruthy();
    expect(screen.queryByText("Made with Orazaka")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Show how it was made" }));
    expect(screen.getByText("Made with Orazaka")).toBeTruthy();
    expect(screen.getByText("Run · 6351addc…")).toBeTruthy();
    expect(screen.getByText("Model · Wan 2.2 A14B")).toBeTruthy();
    expect(screen.getByText("Hardware · NVIDIA H100")).toBeTruthy();
    expect(a11yProblems()).toEqual([]);
  });

  it("reads the description's credit line for videos made before the field existed", async () => {
    await themed(<VideoInfo video={{ ...base, description: `A glide.\n\nMade with Orazaka — run ${RUN} (wan2.2 on NVIDIA H100).` }} />);
    expect(screen.getByText("AI-generated")).toBeTruthy();
  });

  it("speaks French", async () => {
    setLocale("fr");
    await themed(<VideoInfo video={{ ...base, aiProvenance: { generator: "orazaka", runId: RUN } }} />);
    expect(screen.getByText("Générée par IA")).toBeTruthy();
    expect(screen.getByText(/24 i\/s/)).toBeTruthy();
  });
});
