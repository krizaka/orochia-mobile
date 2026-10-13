import { describe, expect, it } from "@jest/globals";
import fs from "fs";
import path from "path";
import { appUrlFrom } from "../lib/config";

const ROOT = path.resolve(__dirname, "../..");
const CONTEXT = /^(EXPO_PUBLIC_)?(APP|AUTH|MEDIA|PUSH|PAYMENTS|REALTIME|ABUSE|OBSERVABILITY|AI|OPERATOR)_[A-Z0-9_]+$/;

describe("environment (krizaka/.github#46)", () => {
  it("defaults to the development deployment and trims a trailing slash", () => {
    expect(appUrlFrom(undefined)).toBe("https://dev.orochia.com");
    expect(appUrlFrom("http://10.0.2.2:3000/")).toBe("http://10.0.2.2:3000");
  });

  it("refuses a malformed platform URL at start", () => {
    expect(() => appUrlFrom("dev.orochia.com")).toThrow("EXPO_PUBLIC_APP_URL");
    expect(() => appUrlFrom("ftp://dev.orochia.com")).toThrow("EXPO_PUBLIC_APP_URL");
  });

  it("names every variable it reads by its bounded context, never a product or a vendor", () => {
    const files = ["app.config.js", "src/lib/config.ts"];
    const names = new Set<string>();
    for (const f of files) for (const m of fs.readFileSync(path.join(ROOT, f), "utf8").matchAll(/process\.env\.([A-Z][A-Z0-9_]*[A-Z0-9])\b/g)) names.add(m[1]);
    const eas = JSON.parse(fs.readFileSync(path.join(ROOT, "eas.json"), "utf8")) as { build: Record<string, { env?: Record<string, string> }> };
    for (const profile of Object.values(eas.build)) for (const name of Object.keys(profile.env ?? {})) names.add(name);
    expect(names.size).toBeGreaterThan(0);
    for (const name of names) expect(name).toMatch(CONTEXT);
  });
});
