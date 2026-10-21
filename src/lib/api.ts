import { createAppConfigClient } from "@krizaka/app-config/client";
import { Platform } from "react-native";

import { acceptLanguage } from "@/i18n";

import { APP_VERSION, orochiaUrl } from "./config";
import { clearToken, readToken } from "./session";
import { storage } from "./storage";

/** An API refusal: the HTTP status and the body the server answered (its `code`, `minimum`, `balance`…). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: Record<string, unknown>,
  ) {
    super(typeof body.error === "string" ? body.error : `HTTP ${status}`);
    this.name = "ApiError";
  }
}

/**
 * The app-version contract (krizaka/.github#75): every request says which app and version it is (`X-Client-*`), a
 * `426 Upgrade Required` anywhere shows the update screen, and the launch/resume check asks `/api/v1/app-config`.
 */
export const appConfig = createAppConfigClient({
  baseUrl: orochiaUrl,
  platform: Platform.OS === "ios" ? "ios" : "android",
  version: APP_VERSION,
  fetch: (input, init) => fetch(input, init),
  storage: { getItem: (k) => storage.get(k), setItem: (k, v) => void storage.set(k, v) },
});

let onSignedOut: (() => void) | null = null;
/** Called when the server no longer accepts the stored session (expired, suspended account). */
export function setSignedOutHandler(handler: (() => void) | null) {
  onSignedOut = handler;
}

/** How long a call may wait for an answer: past it, the app says Orochia is out of reach instead of waiting forever. */
export const API_TIMEOUT_MS = 20_000;

/**
 * Calls the Orochia API with the session (a bearer token, never a cookie), as JSON. A 401 on a signed-in call drops the stored session. A call that gets
 * no answer within {@link API_TIMEOUT_MS} fails like a network error (a TypeError); one cancelled by its caller's
 * `signal` rejects as cancelled.
 */
export async function api<T>(path: string, init: { method?: string; body?: unknown; signal?: AbortSignal; headers?: Record<string, string> } = {}): Promise<T> {
  const token = await readToken();
  const controller = new AbortController();
  const cancel = () => controller.abort();
  init.signal?.addEventListener("abort", cancel);
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, API_TIMEOUT_MS);
  let res: Response;
  try {
    res = await appConfig.fetch(`${orochiaUrl()}${path}`, {
      method: init.method ?? "GET",
      headers: {
        Accept: "application/json",
        "Accept-Language": acceptLanguage(),
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      // No cookie jar: the bearer is the only session. React Native's fetch otherwise keeps and replays cookies
      // (iOS's jar outlives sign-out) — a stale cookie once won over the next account's bearer (krizaka/orochia#127).
      credentials: "omit",
      signal: controller.signal,
    });
  } catch (error) {
    if (timedOut) throw new TypeError("Orochia did not answer in time");
    throw error;
  } finally {
    clearTimeout(timer);
    init.signal?.removeEventListener("abort", cancel);
  }
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.status === 401 && token) {
    await clearToken();
    onSignedOut?.();
  }
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}
