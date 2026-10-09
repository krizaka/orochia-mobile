import { OROCHIA_URL } from "./config";
import { clearToken, readToken } from "./session";

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

let onSignedOut: (() => void) | null = null;
/** Called when the server no longer accepts the stored session (expired, suspended account). */
export function setSignedOutHandler(handler: (() => void) | null) {
  onSignedOut = handler;
}

/** Calls the Orochia API with the session, as JSON. A 401 on a signed-in call drops the stored session. */
export async function api<T>(path: string, init: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  const token = await readToken();
  const res = await fetch(`${OROCHIA_URL}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Accept: "application/json",
      ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    signal: init.signal,
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.status === 401 && token) {
    await clearToken();
    onSignedOut?.();
  }
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}
