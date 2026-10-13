import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { ApiError } from "@/lib/api";
import { clearToken } from "@/lib/session";
import { checkUsername, DEVICE_HEADER, deviceId, isAdult, isoDate, openSignUp, register, resetDeviceCache, signUpProblem } from "@/lib/signup";
import { storage } from "@/lib/storage";
import { answerFetch } from "@/test/api";
import { resetStorage } from "@/test/storage";

jest.mock("@/lib/storage", () => jest.requireActual("@/test/storage"));

beforeEach(async () => {
  resetStorage();
  resetDeviceCache();
  await clearToken();
});

const person = { email: "eric@example.com", username: "eric_m", displayName: "", password: "a-long-password-1", dateOfBirth: "1990-04-12", isAgeVerified: true, acceptTerms: true };

describe("the device id", () => {
  it("is made once per install, shaped as the server expects, and kept in secure storage", async () => {
    const id = await deviceId();
    expect(id).toMatch(/^[A-Za-z0-9_-]{16,64}$/);
    resetDeviceCache();
    expect(await deviceId()).toBe(id);
    expect(await storage.get("orochia.device")).toBe(id);
  });
});

describe("the sign-up API client", () => {
  it("opens the form as a native client, with the device id in a header", async () => {
    const { calls } = answerFetch({ "/api/auth/register": { success: true, formToken: "v1.1.sig", challenge: null } });
    const form = await openSignUp();
    expect(form).toEqual({ formToken: "v1.1.sig", challenge: null });
    expect(calls[0].path).toBe("/api/auth/register?client=native");
    expect(calls[0].headers[DEVICE_HEADER]).toBe(await deviceId());
  });

  it("asks the server whether a username is free", async () => {
    const { calls } = answerFetch({ "/api/auth/username": { success: true, available: false, reason: "taken", suggestion: "eric_m2" } });
    expect(await checkUsername("Eric M")).toEqual({ available: false, reason: "taken", suggestion: "eric_m2" });
    expect(calls[0].path).toBe("/api/auth/username?username=Eric%20M");
  });

  it("posts what the web form posts, as a native client: the display name falls back to the username, the honeypot is empty", async () => {
    const { calls } = answerFetch({ "/api/auth/register": { status: 201, body: { success: true, verificationRequired: true, token: "new-session", expiresIn: 604800 } } });
    const res = await register(person, { formToken: "v1.1.sig", challenge: null }, null);
    expect(res.token).toBe("new-session");
    expect(calls[0].method).toBe("POST");
    expect(calls[0].headers[DEVICE_HEADER]).toBe(await deviceId());
    expect(calls[0].body).toEqual({ ...person, displayName: "eric_m", formToken: "v1.1.sig", website: "", client: "native" });
  });

  it("sends the bot challenge's token when there is one", async () => {
    const { calls } = answerFetch({ "/api/auth/register": { status: 201, body: { success: true, token: "s" } } });
    await register(person, { formToken: "f", challenge: { provider: "turnstile", siteKey: "k" } }, "turnstile-token");
    expect((calls[0].body as { challengeToken: string }).challengeToken).toBe("turnstile-token");
  });
});

describe("dates", () => {
  it("reads a real day, month and year, and refuses impossible ones", () => {
    expect(isoDate("4", "5", "1992")).toBe("1992-05-04");
    expect(isoDate("30", "02", "2001")).toBeNull();
    expect(isoDate("12", "13", "2001")).toBeNull();
    expect(isoDate("1", "1", "92")).toBeNull();
  });

  it("is 18 on the birthday, not the day before", () => {
    const today = new Date(2026, 9, 12);
    expect(isAdult("2008-10-12", today)).toBe(true);
    expect(isAdult("2008-10-13", today)).toBe(false);
  });
});

describe("the server's refusals, on the form", () => {
  const refusal = (status: number, body: Record<string, unknown>) => signUpProblem(new ApiError(status, body));

  it("puts a minor's refusal on the date of birth", () => {
    expect(refusal(403, { error: "Orochia is for adults only: you must be 18 or older.", code: "UNDERAGE" }).fields.dateOfBirth).toBe("Orochia is for adults only: you must be 18 or older.");
  });

  it("puts validation errors on their fields, in the app's words", () => {
    const problem = refusal(400, { error: "Invalid payload", details: { formErrors: [], fieldErrors: { email: ["Invalid email"], password: ["At least 10 characters"], acceptTerms: ["The terms must be accepted"] } } });
    expect(problem.fields).toEqual({
      email: "Enter a valid e-mail address.",
      password: "Choose a password of at least 10 characters.",
      acceptTerms: "Accept the Terms of Service to continue.",
    });
    expect(problem.form).toBeNull();
  });

  it("puts a disposable address on the e-mail and a reserved username on the username", () => {
    expect(refusal(400, { code: "EMAIL_DOMAIN_REFUSED" }).fields.email).toMatch(/Disposable/);
    expect(refusal(400, { code: "USERNAME_RESERVED" }).fields.username).toMatch(/reserved/);
  });

  it("says an existing account above the button", () => {
    expect(refusal(409, { error: "Username or e-mail already registered", code: "ACCOUNT_EXISTS" }).form).toMatch(/already has an account/);
  });

  it("asks for a new form after an anti-bot refusal, and says the limits", () => {
    expect(refusal(400, { code: "FORM_TOO_FAST" })).toEqual({ fields: {}, form: "Please try again.", reopen: true });
    expect(refusal(400, { code: "FORM_EXPIRED" }).form).toBe("This form has expired. Try again.");
    expect(refusal(503, { code: "CHALLENGE_UNAVAILABLE" }).form).toMatch(/unavailable/);
    expect(refusal(429, { error: "Too many registrations. Try again later." }).form).toBe("Too many sign-ups from here. Try again later.");
  });

  it("says the network when Orochia cannot be reached, and never shows a server's 500 text", () => {
    expect(signUpProblem(new TypeError("Network request failed")).form).toBe("Orochia is out of reach. Check your connection.");
    expect(refusal(500, { error: "Internal server error" }).form).toBe("Something went wrong. Try again.");
  });
});
