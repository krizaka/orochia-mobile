/**
 * Universal links (iOS) and App Links (Android) open the app with the https address of the web page. Expo Router
 * cannot route a segment starting with « @ », so a profile link (`/@handle`) is rewritten to the profile screen
 * (`/u/handle`); every other claimed path (`/watch/*`, `/me/*`, `/auctions/*`, `/challenges/*`, `/messages`) is a
 * screen of the same name. Which paths are claimed is `app.json` (checked against the web app by `scripts/check-app-links.mjs`).
 */
export function linkToRoute(link: string): string {
  let path = link;
  let search = "";
  try {
    const url = new URL(link);
    path = url.protocol === "http:" || url.protocol === "https:" ? url.pathname : `/${url.host}${url.pathname}`.replace(/\/+$/, "") || "/";
    search = url.search;
  } catch {
    const q = link.indexOf("?");
    if (q >= 0) [path, search] = [link.slice(0, q), link.slice(q)];
  }
  const profile = /^\/@([^/]+)\/?$/.exec(path);
  return (profile ? `/u/${profile[1]}` : path) + search;
}
