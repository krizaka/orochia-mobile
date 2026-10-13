// The networking module behind React Native's fetch (no public typings): `clearCookies` empties the app's native cookie
// jar — NSHTTPCookieStorage on iOS, the CookieManager on Android.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const networking = require("react-native/Libraries/Network/RCTNetworking").default as { clearCookies: (callback: (cleared: boolean) => void) => void };

/**
 * Empties the native cookie jar (krizaka/orochia#127). The app never relies on cookies — its session is a bearer token
 * and every call says `credentials: "omit"` — but a jar filled by an older version, or by any route, outlives the
 * app's sign-out on iOS: it is emptied at sign-out and before a sign-in or a sign-up, so no cookie of the previous
 * account can ride along with the next one's calls.
 */
export function clearNativeCookies(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      networking.clearCookies((cleared) => resolve(cleared));
    } catch {
      resolve(false);
    }
  });
}
