/**
 * Where the app talks to: the Orochia web app's API. EXPO_PUBLIC_OROCHIA_URL is read at build time (a dev build points
 * at a local server, a release at the deployment); without it, the public development deployment.
 */
export const OROCHIA_URL = (process.env.EXPO_PUBLIC_OROCHIA_URL ?? "https://dev.orochia.com").replace(/\/$/, "");

/** A media URL the API answered: absolute already, or a path on the Orochia host (default avatars, presets). */
export function absoluteUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith("/") ? `${OROCHIA_URL}${url}` : url;
}
