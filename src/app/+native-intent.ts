import { linkToRoute } from "@/lib/app-links";

/** Where an incoming link (universal link, App Link, `orochia://`) opens: see `src/lib/app-links.ts`. */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  return linkToRoute(path);
}
