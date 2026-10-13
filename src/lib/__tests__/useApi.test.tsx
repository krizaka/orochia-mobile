import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useApi } from "@/lib/useApi";
import { clearToken, saveToken } from "@/lib/session";
import { answerFetch } from "@/test/api";
import { resetStorage } from "@/test/storage";
import feedSeed from "@/__fixtures__/api/feed.local-seed.json";
import feedEmpty from "@/__fixtures__/api/feed.dev-empty.json";

jest.mock("@/lib/storage", () => jest.requireActual("@/test/storage"));

type Feed = { videos: { id: string }[] };

beforeEach(async () => {
  resetStorage();
  await clearToken();
});

describe("useApi", () => {
  it("is loading until the API answers", async () => {
    global.fetch = jest.fn(() => new Promise<Response>(() => undefined)) as unknown as typeof fetch;
    const { result } = await renderHook(() => useApi<Feed>("/api/feed?limit=30"));
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
  });

  it("loads, then holds the data", async () => {
    answerFetch({ "/api/feed": feedSeed });
    const { result } = await renderHook(() => useApi<Feed>("/api/feed?limit=30"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.videos).toHaveLength(3);
    expect(result.current.error).toBeNull();
  });

  it("does nothing without a path", async () => {
    const { fetchMock } = answerFetch({});
    const { result } = await renderHook(() => useApi<Feed>(null));
    expect(result.current.loading).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps the error of a failed load, and clears it on a successful refresh", async () => {
    answerFetch({});
    const { result } = await renderHook(() => useApi<Feed>("/api/feed?limit=30"));
    await waitFor(() => expect(result.current.error).not.toBeNull());
    answerFetch({ "/api/feed": feedEmpty });
    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.error).toBeNull();
    expect(result.current.data?.videos).toEqual([]);
    expect(result.current.refreshing).toBe(false);
  });

  it("keeps what is on screen when a silent reload fails", async () => {
    answerFetch({ "/api/feed": feedSeed });
    const { result } = await renderHook(() => useApi<Feed>("/api/feed?limit=30"));
    await waitFor(() => expect(result.current.data).not.toBeNull());
    answerFetch({});
    await act(async () => {
      await result.current.reload();
    });
    expect(result.current.data?.videos).toHaveLength(3);
    expect(result.current.error).toBeNull();
  });

  it("forgets one account's data when the session ends, and loads the next account's (krizaka/orochia#127)", async () => {
    await saveToken("session-of-a");
    answerFetch({ "/api/feed": feedSeed });
    const { result } = await renderHook(() => useApi<Feed>("/api/feed?limit=30"));
    await waitFor(() => expect(result.current.data?.videos).toHaveLength(3));
    answerFetch({ "/api/feed": feedEmpty });
    await act(async () => {
      await clearToken();
    });
    await waitFor(() => expect(result.current.data?.videos).toEqual([]));
    answerFetch({ "/api/feed": feedSeed });
    await act(async () => {
      await saveToken("session-of-b");
    });
    await waitFor(() => expect(result.current.data?.videos).toHaveLength(3));
  });

  it("does not reload when a token is only refreshed", async () => {
    await saveToken("session-of-a");
    const { fetchMock } = answerFetch({ "/api/feed": feedSeed });
    const { result } = await renderHook(() => useApi<Feed>("/api/feed?limit=30"));
    await waitFor(() => expect(result.current.data).not.toBeNull());
    await act(async () => {
      await saveToken("session-of-a-refreshed");
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
