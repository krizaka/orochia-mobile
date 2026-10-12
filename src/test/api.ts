import { jest } from "@jest/globals";

/**
 * Answers the app's `fetch` from recorded API responses (`src/__fixtures__/api`, recorded from a local Orochia on its
 * development seed and from dev.orochia.com): a route is a path prefix → a JSON body (status 200) or `{ status, body }`.
 * Every call is kept, so a test can check what the app sent (method, headers, body).
 */
export type Route = unknown | { status: number; body: unknown };

export function answerFetch(routes: Record<string, Route>) {
  const calls: { path: string; method: string; headers: Record<string, string>; body: unknown }[] = [];
  const fetchMock = jest.fn(async (input: unknown, init?: { method?: string; headers?: Record<string, string>; body?: string }) => {
    const url = new URL(String(input));
    const path = url.pathname + url.search;
    calls.push({ path, method: init?.method ?? "GET", headers: init?.headers ?? {}, body: init?.body ? JSON.parse(init.body) : undefined });
    const key = Object.keys(routes)
      .filter((k) => path.startsWith(k))
      .sort((a, b) => b.length - a.length)[0];
    if (key === undefined) throw new TypeError(`Network request failed (no recorded answer for ${path})`);
    const route = routes[key] as { status?: number; body?: unknown };
    const status = typeof route === "object" && route !== null && typeof route.status === "number" && "body" in route ? route.status : 200;
    const body = status === 200 && !(typeof route === "object" && route !== null && "body" in route && "status" in route) ? route : route.body;
    return { ok: status >= 200 && status < 300, status, json: async () => body, text: async () => JSON.stringify(body) } as Response;
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return { fetchMock, calls };
}
