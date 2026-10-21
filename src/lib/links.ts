import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { orochiaWebUrl } from "./config";

/**
 * Opens an Orochia path (a notification's `path`): the screens the app has natively, the web page for the rest.
 */
export function openPath(path: string) {
  const challenge = path.match(/^\/challenges\/([0-9a-f-]{36})/);
  const watch = path.match(/^\/watch\/([0-9a-f-]{36})/);
  const auction = path.match(/^\/auctions\/([0-9a-f-]{36})/);
  const conversation = path.match(/^\/messages\/([0-9a-f-]{36})/);
  if (conversation) return router.push(`/messages/${conversation[1]}`);
  if (path.startsWith("/messages")) return router.push("/messages");
  if (challenge) return router.push(`/challenges/${challenge[1]}`);
  if (watch) return router.push(`/watch/${watch[1]}`);
  if (auction) return router.push(`/auctions/${auction[1]}`);
  if (path.startsWith("/challenges")) return router.push("/challenges");
  if (path.startsWith("/auctions")) return router.push("/auctions");
  void WebBrowser.openBrowserAsync(`${orochiaWebUrl()}${path}`);
}
