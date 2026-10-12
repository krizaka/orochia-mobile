import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { api, ApiError, setSignedOutHandler } from "@/lib/api";
import { clearToken, readToken, saveToken } from "@/lib/session";
import { answerFetch } from "@/test/api";
import { resetStorage } from "@/test/storage";
import walletSeed from "@/__fixtures__/api/me-wallet.local-seed.json";

jest.mock("@/lib/storage", () => jest.requireActual("@/test/storage"));

beforeEach(async () => {
  resetStorage();
  await clearToken();
  setSignedOutHandler(null);
});

describe("api", () => {
  it("sends the stored session as a bearer token and answers the JSON body", async () => {
    await saveToken("session-1");
    const { calls } = answerFetch({ "/api/me/wallet": walletSeed });
    const wallet = await api<{ balanceCents: number }>("/api/me/wallet");
    expect(wallet.balanceCents).toBe(0);
    expect(calls[0].headers.Authorization).toBe("Bearer session-1");
    expect(calls[0].headers.Accept).toBe("application/json");
  });

  it("sends no Authorization header without a session, and JSON with a body", async () => {
    const { calls } = answerFetch({ "/api/auth/login": { success: true } });
    await api("/api/auth/login", { method: "POST", body: { identifier: "a", password: "b", client: "native" } });
    expect(calls[0].headers.Authorization).toBeUndefined();
    expect(calls[0].headers["Content-Type"]).toBe("application/json");
  });

  it("throws the status and body of a refusal", async () => {
    answerFetch({ "/api/auctions/a1/bids": { status: 409, body: { error: "Outbid", code: "OUTBID", minimum: 1600 } } });
    const error = await api("/api/auctions/a1/bids", { method: "POST", body: { amountCents: 1500 } }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(409);
    expect((error as ApiError).body.minimum).toBe(1600);
    expect((error as ApiError).message).toBe("Outbid");
  });

  it("drops the session and signs out when the server refuses it (401)", async () => {
    await saveToken("expired");
    const signedOut = jest.fn();
    setSignedOutHandler(signedOut);
    answerFetch({ "/api/me/wallet": { status: 401, body: { error: "Unauthorized" } } });
    await expect(api("/api/me/wallet")).rejects.toBeInstanceOf(ApiError);
    expect(await readToken()).toBeNull();
    expect(signedOut).toHaveBeenCalledTimes(1);
  });

  it("keeps the session on a 401 of an anonymous call (wrong password)", async () => {
    const signedOut = jest.fn();
    setSignedOutHandler(signedOut);
    answerFetch({ "/api/auth/login": { status: 401, body: { error: "Invalid credentials" } } });
    await expect(api("/api/auth/login", { method: "POST", body: {} })).rejects.toBeInstanceOf(ApiError);
    expect(signedOut).not.toHaveBeenCalled();
  });
});
