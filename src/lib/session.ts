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

const listeners = new Set<() => void>();
/**
 * Called when the session starts or ends (not when a token is refreshed): screens forget what they loaded for the
 * previous account (krizaka/orochia#127). Returns the unsubscribe function.
 */
export function onSessionChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export async function saveToken(token: string): Promise<void> {
  const started = !cached;
  cached = token;
  await storage.set(KEY, token);
  if (started) listeners.forEach((l) => l());
}

export async function clearToken(): Promise<void> {
  const ended = cached !== null;
  cached = null;
  await storage.remove(KEY);
  if (ended) listeners.forEach((l) => l());
}
