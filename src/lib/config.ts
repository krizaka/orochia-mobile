import Constants from "expo-constants";

/**
 * The app's environment — one module. Build-time values only (Expo inlines `process.env.EXPO_PUBLIC_*` read literally),
 * named by bounded context (krizaka/.github#46): `EXPO_PUBLIC_<CONTEXT>_<THING>`, never a product or a vendor.
 *   EXPO_PUBLIC_APP_URL   the platform the app talks to (its web app's API); default: the development deployment
 * Native build inputs live in app.config.js (PUSH_ANDROID_CONFIG_FILE). A malformed value fails at start, never later.
 */
export function appUrlFrom(raw: string | undefined): string {
  const value = raw?.trim() || "https://dev.orochia.com";
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("EXPO_PUBLIC_APP_URL must be an absolute http(s) URL");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("EXPO_PUBLIC_APP_URL must be an absolute http(s) URL");
  return value.replace(/\/$/, "");
}

export const OROCHIA_URL = appUrlFrom(process.env.EXPO_PUBLIC_APP_URL);

/** The version the app runs, from app.json (the build), never typed twice. */
export const APP_VERSION = Constants.expoConfig?.version ?? "0.0.0";

/** A media URL the API answered: absolute already, or a path on the Orochia host (default avatars, presets). */
export function absoluteUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith("/") ? `${OROCHIA_URL}${url}` : url;
}
