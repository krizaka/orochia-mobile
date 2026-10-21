import React from "react";
import { generateKeyPairSync } from "crypto";
import fs from "fs";
import path from "path";
import { describe, expect, it, jest } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import { ThemeProvider } from "@krizaka/ui/native";
import { DiscoveryProvider } from "@krizaka/discovery/react";
import { signManifest } from "@krizaka/discovery/sign";
import type { ManifestBody, ServiceEntry } from "@krizaka/discovery";
import { DiscoveryGate } from "@/components/DiscoveryGate";
import { setLocale } from "@/i18n";
import { api } from "@/lib/api";
import { absoluteUrl, BAKED_ADDRESSES, createAppDiscovery, discovery, LEGACY_ADDRESSES, orochiaUrl, orochiaWebUrl, UPDATE_URL } from "@/lib/config";

jest.mock("expo-secure-store", () => ({ getItemAsync: jest.fn(async () => null), setItemAsync: jest.fn(async () => undefined), deleteItemAsync: jest.fn(async () => undefined) }));

const ROOT = path.resolve(__dirname, "../..");
const key = (() => {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  return {
    seed: privateKey.export({ format: "der", type: "pkcs8" }).subarray(-32).toString("base64"),
    publicKey: publicKey.export({ format: "der", type: "spki" }).subarray(-32).toString("base64"),
  };
})();

const entry = (over: Partial<ServiceEntry> = {}): ServiceEntry => ({ apiBase: "https://dev.orochia.com", webBase: "https://dev.orochia.com", minAppVersion: "1.0.0", latestAppVersion: "1.0.0", status: "ok", ...over });
const manifest = (over: Partial<ServiceEntry> = {}, issuedAt = "2026-10-21T12:00:00Z") => {
  const body: ManifestBody = { schemaVersion: 1, keyId: "k1", issuedAt, services: { orochia: { dev: entry(over) } } };
  return JSON.stringify(signManifest(body, key.seed));
};
const memory = () => {
  const data = new Map<string, string>();
  return { getItem: async (k: string) => data.get(k) ?? null, setItem: async (k: string, v: string) => void data.set(k, v), removeItem: async (k: string) => void data.delete(k) };
};
const serving = (get: () => string) => (async () => ({ ok: true, status: 200, text: async () => get() })) as unknown as typeof fetch;
const make = (get: () => string) => createAppDiscovery({ fetch: serving(get), publicKeys: { k1: key.publicKey }, storage: memory() });

describe("no hard-coded backend address (krizaka/.github#120, ADR-003)", () => {
  const files = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]));
  it("keeps the hosts in lib/config.ts only (the baked default and the legacy fallback), and every EAS profile free of one", () => {
    const offenders = files(path.join(ROOT, "src"))
      .filter((f) => /\.(ts|tsx)$/.test(f) && !/__tests__|__fixtures__|\/test\//.test(f) && !f.endsWith(path.join("lib", "config.ts")))
      .filter((f) => /https?:\/\/(?:dev|www)\.orochia\.com/.test(fs.readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
    expect(fs.readFileSync(path.join(ROOT, "eas.json"), "utf8")).not.toMatch(/orochia\.com/);
  });
  it("bakes the dev site as the default and the legacy address, until the manifest says otherwise", () => {
    expect(BAKED_ADDRESSES.apiBase).toBe("https://dev.orochia.com");
    expect(LEGACY_ADDRESSES.apiBase).toBe("https://dev.orochia.com");
    expect(orochiaUrl()).toBe("https://dev.orochia.com");
    expect(orochiaWebUrl()).toBe("https://dev.orochia.com");
    expect(discovery.getService("orochia").source).toBe("default");
  });
  it("sends the update screen to TestFlight and the EAS builds while the app is not in the stores", () => {
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, "app.json"), "utf8")) as { expo: { owner: string; slug: string } };
    expect(UPDATE_URL.ios).toBe("itms-beta://");
    expect(UPDATE_URL.android).toBe(`https://expo.dev/accounts/${app.expo.owner}/projects/${app.expo.slug}/builds`);
  });
});

describe("the live switch: a manifest edit moves the app without a rebuild", () => {
  it("follows the web address when the manifest moves it, and the API address", async () => {
    let current = manifest();
    const d = make(() => current);
    await d.start();
    expect(d.getService("orochia")).toMatchObject({ apiBase: "https://dev.orochia.com", webBase: "https://dev.orochia.com", source: "live" });
    current = manifest({ webBase: "https://www.orochia.com", apiBase: "https://api.orochia.com" }, "2026-10-21T13:00:00Z");
    await d.refresh();
    expect(d.getService("orochia")).toMatchObject({ apiBase: "https://api.orochia.com", webBase: "https://www.orochia.com" });
  });

  it("refuses an address outside the allow-list even when signed, and keeps the baked one", async () => {
    const d = make(() => manifest({ apiBase: "https://attacker.example.net" }));
    await d.start();
    expect(d.getService("orochia")).toMatchObject({ apiBase: "https://dev.orochia.com", source: "default" });
  });

  it("api() calls the address discovery gives at that moment", async () => {
    const calls: string[] = [];
    const original = global.fetch;
    global.fetch = (async (url: string) => (calls.push(url), { ok: true, status: 200, json: async () => ({}), headers: new Headers() })) as unknown as typeof fetch;
    const spy = jest.spyOn(discovery, "getService");
    try {
      spy.mockReturnValue({ apiBase: "https://api.orochia.com", webBase: "https://www.orochia.com", authBase: "https://api.orochia.com", source: "live" });
      await api("/api/feed");
      spy.mockReturnValue({ apiBase: "https://other.orochia.com", webBase: "https://www.orochia.com", authBase: "https://other.orochia.com", source: "live" });
      await api("/api/feed");
    } finally {
      spy.mockRestore();
      global.fetch = original;
    }
    expect(calls).toEqual(["https://api.orochia.com/api/feed", "https://other.orochia.com/api/feed"]);
  });

  it("resolves a media path against the media host when the manifest has one", () => {
    const spy = jest.spyOn(discovery, "getService").mockReturnValue({ apiBase: "https://api.orochia.com", webBase: "https://www.orochia.com", authBase: "https://api.orochia.com", mediaBase: "https://media.orochia.com", source: "live" });
    expect(absoluteUrl("/avatars/a.png")).toBe("https://media.orochia.com/avatars/a.png");
    spy.mockReturnValue({ apiBase: "https://api.orochia.com", webBase: "https://www.orochia.com", authBase: "https://api.orochia.com", source: "live" });
    expect(absoluteUrl("/avatars/a.png")).toBe("https://api.orochia.com/avatars/a.png");
    expect(absoluteUrl("https://cdn.example/a.png")).toBe("https://cdn.example/a.png");
    expect(absoluteUrl(null)).toBeNull();
    spy.mockRestore();
  });
});

describe("the gate the manifest raises", () => {
  const shown = async (get: () => string, appVersion = "1.0.0") => {
    const d = createAppDiscovery({ fetch: serving(get), publicKeys: { k1: key.publicKey }, storage: memory(), appVersion });
    await render(
      <ThemeProvider>
        <DiscoveryProvider discovery={d} refreshEveryMs={0}>
          <DiscoveryGate>
            <Text>the app</Text>
          </DiscoveryGate>
        </DiscoveryProvider>
      </ThemeProvider>,
    );
  };

  it("shows the app when the build is current", async () => {
    await shown(() => manifest());
    expect(await screen.findByText("the app")).toBeTruthy();
  });

  it("replaces the app with the update screen below minAppVersion, with the message in the app's language", async () => {
    setLocale("fr");
    try {
      await shown(() => manifest({ minAppVersion: "2.0.0", latestAppVersion: "2.1.0", message: { en: "Please update.", fr: "Mettez à jour." } }));
      expect(await screen.findByText("Mettez à jour.")).toBeTruthy();
      expect(screen.queryByText("the app")).toBeNull();
    } finally {
      setLocale("en");
    }
  });

  it("replaces the app with the maintenance screen and its message", async () => {
    await shown(() => manifest({ status: "maintenance", message: { en: "Back at noon.", fr: "De retour à midi." } }));
    await waitFor(() => expect(screen.getByText("Orochia is under maintenance")).toBeTruthy());
    expect(screen.getByText("Back at noon.")).toBeTruthy();
  });
});
