import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "@jest/globals";
import app from "../../../app.json";
import { linkToRoute } from "../app-links";

const APP_DIR = path.join(__dirname, "../../app");

/** Expo Router screens as route patterns (groups and layouts folded), to check a path opens something. */
function screens(dir = APP_DIR, segs: string[] = []): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.isDirectory()) return screens(path.join(dir, e.name), /^\(.*\)$/.test(e.name) ? segs : [...segs, e.name]);
    const m = /^(.*)\.(tsx|ts)$/.exec(e.name);
    if (!m || m[1].startsWith("_") || m[1].startsWith("+")) return [];
    return ["/" + [...segs, ...(m[1] === "index" ? [] : [m[1]])].join("/")];
  });
}
const opens = (route: string) =>
  screens().some((s) => new RegExp("^" + s.split("/").map((p) => (/^\[.+\]$/.test(p) ? "[^/]+" : p)).join("/") + "$").test(route));

describe("universal links and App Links open the app", () => {
  it("rewrites a public profile link (/@handle) to the profile screen, whatever the host", () => {
    expect(linkToRoute("/@lena_voss")).toBe("/u/lena_voss");
    expect(linkToRoute("https://dev.orochia.com/@lena_voss")).toBe("/u/lena_voss");
    expect(linkToRoute("https://dev.orochia.com/@lena_voss?tab=ppv")).toBe("/u/lena_voss?tab=ppv");
  });

  it("leaves the other claimed paths as they are", () => {
    expect(linkToRoute("https://dev.orochia.com/watch/abc")).toBe("/watch/abc");
    expect(linkToRoute("/me/earnings")).toBe("/me/earnings");
    expect(linkToRoute("orochia://settings/notifications")).toBe("/settings/notifications");
  });

  it("is declared for the domain on iOS and verified on Android", () => {
    expect(app.expo.ios.associatedDomains).toEqual(["applinks:dev.orochia.com"]);
    const filter = app.expo.android.intentFilters.find((f) => f.autoVerify);
    expect(filter?.action).toBe("VIEW");
    expect(filter?.category).toEqual(["BROWSABLE", "DEFAULT"]);
    expect(filter?.data.every((d) => d.scheme === "https" && d.host === "dev.orochia.com")).toBe(true);
  });

  it("every path the Android filter claims opens a screen", () => {
    const filter = app.expo.android.intentFilters.find((f) => f.autoVerify)!;
    for (const d of filter.data as { path?: string; pathPrefix?: string }[]) {
      const sample = d.path ?? (d.pathPrefix!.endsWith("/") ? `${d.pathPrefix}x` : `${d.pathPrefix}x`);
      expect(opens(linkToRoute(sample))).toBe(true);
    }
  });
});
