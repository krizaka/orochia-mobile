import { chunkedStorage, createDiscovery, type DiscoveryOptions, KRIZAKA_HOST_SUFFIXES, KRIZAKA_MANIFEST_URLS, KRIZAKA_PUBLIC_KEYS } from "@krizaka/discovery";
import Constants from "expo-constants";

import { storage } from "./storage";

/**
 * The app's environment — one module. Where the backend lives is NOT a build-time constant: the app asks the signed
 * manifest on krizaka.com (@krizaka/discovery, krizaka/.github ADR-003), so moving Orochia never needs a store release.
 * Build-time inputs, named by bounded context (krizaka/.github#46), only for local work:
 *   EXPO_PUBLIC_APP_URL   an address that wins over discovery (a machine on the network, a tunnel); unset in every EAS profile
 *   EXPO_PUBLIC_APP_ENV   `dev` (default) | `prod`: which entry of the manifest this build follows
 * Native build inputs live in app.config.js (PUSH_ANDROID_CONFIG_FILE). A malformed value fails at start, never later.
 */
export function appUrlOverrideFrom(raw: string | undefined): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("EXPO_PUBLIC_APP_URL must be an absolute http(s) URL");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("EXPO_PUBLIC_APP_URL must be an absolute http(s) URL");
  return value.replace(/\/$/, "");
}

export function appEnvironmentFrom(raw: string | undefined): "dev" | "prod" {
  const value = raw?.trim() || "dev";
  if (value !== "dev" && value !== "prod") throw new Error("EXPO_PUBLIC_APP_ENV must be dev or prod");
  return value;
}

/** The version the app runs, from app.json (the build), never typed twice. */
export const APP_VERSION = Constants.expoConfig?.version ?? "0.0.0";

/** Baked in the build: the addresses used until a verified manifest says otherwise (the manifest's own values at build time). */
export const BAKED_ADDRESSES = { apiBase: "https://dev.orochia.com", webBase: "https://dev.orochia.com" } as const;
/** The address hard-coded before discovery existed: the last resort when there is no cache and no baked default. */
export const LEGACY_ADDRESSES = { apiBase: "https://dev.orochia.com", webBase: "https://dev.orochia.com" } as const;

/** Where an update is while the app is distributed through TestFlight and EAS (the stores' pages replace these at launch). */
export const UPDATE_URL = { ios: "itms-beta://", android: "https://expo.dev/accounts/oussamaabid/projects/orochia/builds" } as const;

/** Builds the app's discovery client; tests pass their own fetch, storage and keys. */
export function createAppDiscovery(options: Partial<DiscoveryOptions> = {}) {
  const override = appUrlOverrideFrom(process.env.EXPO_PUBLIC_APP_URL);
  return createDiscovery({
    environment: appEnvironmentFrom(process.env.EXPO_PUBLIC_APP_ENV),
    appVersion: APP_VERSION,
    manifestUrls: KRIZAKA_MANIFEST_URLS,
    publicKeys: KRIZAKA_PUBLIC_KEYS,
    allowedHostSuffixes: [...KRIZAKA_HOST_SUFFIXES, "orochia.com"],
    defaults: { orochia: BAKED_ADDRESSES },
    legacy: { orochia: LEGACY_ADDRESSES },
    ...(override ? { overrides: { orochia: { apiBase: override, webBase: override } } } : {}),
    // The Keychain / Keystore, in pieces under their per-value limit. The document is signed: what is read back is verified again.
    storage: chunkedStorage({
      getItem: (key) => storage.get(key),
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.remove(key),
    }),
    ...options,
  });
}

export const discovery = createAppDiscovery();

/** The Orochia API (bearer calls, the live streams): what the manifest says now. Read at each call, never kept. */
export const orochiaUrl = (): string => discovery.getService("orochia").apiBase;
/** The Orochia website (legal pages, « open on the web », the sign-up challenge page). */
export const orochiaWebUrl = (): string => discovery.getService("orochia").webBase;

/** A media URL the API answered: absolute already, or a path on the Orochia host (default avatars, presets). */
export function absoluteUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (!url.startsWith("/")) return url;
  const service = discovery.getService("orochia");
  return `${service.mediaBase ?? service.apiBase}${url}`;
}
