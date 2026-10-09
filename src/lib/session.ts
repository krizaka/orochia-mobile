import { storage } from "./storage";

/**
 * The session token, in the device's secure storage (Keychain on iOS, Keystore-backed on Android) — never in plain
 * storage. It is the same signed token the web app keeps in an httpOnly cookie, sent here as `Authorization: Bearer`.
 */
const KEY = "orochia.session";
let cached: string | null | undefined;

export async function readToken(): Promise<string | null> {
  if (cached === undefined) cached = await storage.get(KEY);
  return cached;
}

export async function saveToken(token: string): Promise<void> {
  cached = token;
  await storage.set(KEY, token);
}

export async function clearToken(): Promise<void> {
  cached = null;
  await storage.remove(KEY);
}
