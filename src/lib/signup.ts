import { t, type MessageKey } from "@/i18n";
import { api, ApiError } from "./api";
import { storage } from "./storage";

/**
 * Sign-up from the app, on the same API as the web form (krizaka/orochia `/api/auth/register`): the server decides
 * everything — the username's format and availability, the password's length, 18+ from the date of birth, the terms,
 * the anti-bot checks (form token, minimal delay, honeypot, disposable addresses, per-device limit, Turnstile when it is
 * on). The app only carries what the browser would: a device id (in a header instead of a cookie) and the session
 * token in the answer (`client: "native"`), kept in secure storage like a sign-in's.
 */

/** The fields a person fills; their names are the API's, so its validation errors land on the right field. */
export type SignUpField = "email" | "username" | "displayName" | "password" | "dateOfBirth" | "isAgeVerified" | "acceptTerms";

export interface SignUpInput {
  email: string;
  username: string;
  displayName: string;
  password: string;
  /** YYYY-MM-DD */
  dateOfBirth: string;
  isAgeVerified: boolean;
  acceptTerms: boolean;
}

/** The public bot-challenge settings, when the server asks for one (Cloudflare Turnstile). */
export interface PublicChallenge {
  provider: "turnstile";
  siteKey: string;
}

export interface SignUpForm {
  formToken: string;
  challenge: PublicChallenge | null;
}

export interface UsernameCheck {
  available: boolean;
  reason?: "format" | "reserved" | "taken";
  suggestion?: string;
}

const DEVICE_KEY = "orochia.device";
/** The header the server reads the app's device id from (apps/web/lib/abuse/signup-guard.ts). */
export const DEVICE_HEADER = "X-Orochia-Device";
let device: string | undefined;

/**
 * This install's device id: random, made once and kept in secure storage — what the web's device cookie is to a
 * browser (it binds the form token and counts sign-ups per device). It identifies nothing about the person.
 */
export async function deviceId(): Promise<string> {
  if (device) return device;
  const stored = await storage.get(DEVICE_KEY);
  if (stored && /^[A-Za-z0-9_-]{16,64}$/.test(stored)) return (device = stored);
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
  const fresh = Array.from({ length: 32 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  await storage.set(DEVICE_KEY, fresh);
  return (device = fresh);
}

/** Forgets the cached id (tests). */
export function resetDeviceCache() {
  device = undefined;
}

/** Opens a sign-up form: a form token bound to this device, and the bot challenge when the server asks for one. */
export async function openSignUp(): Promise<SignUpForm> {
  const res = await api<{ formToken: string; challenge: PublicChallenge | null }>("/api/auth/register?client=native", {
    headers: { [DEVICE_HEADER]: await deviceId() },
  });
  return { formToken: res.formToken, challenge: res.challenge ?? null };
}

/** Whether a username is free, with a free one suggested when it is not (the server's answer, as the web shows it). */
export async function checkUsername(username: string, signal?: AbortSignal): Promise<UsernameCheck> {
  const res = await api<UsernameCheck>(`/api/auth/username?username=${encodeURIComponent(username)}`, { signal });
  return { available: res.available, reason: res.reason, suggestion: res.suggestion };
}

export interface SignUpResult {
  token: string;
  /** Only in a demo deployment (never production): the verification link, so the flow can be completed on a test build. */
  devVerificationUrl?: string;
}

/** Creates the account. The honeypot is sent empty, as a person's browser sends it. */
export async function register(input: SignUpInput, form: SignUpForm, challengeToken: string | null): Promise<SignUpResult> {
  const res = await api<{ token?: string; devVerificationUrl?: string }>("/api/auth/register", {
    method: "POST",
    headers: { [DEVICE_HEADER]: await deviceId() },
    body: {
      ...input,
      displayName: input.displayName.trim() || input.username.trim(),
      formToken: form.formToken,
      website: "",
      ...(challengeToken ? { challengeToken } : {}),
      client: "native",
    },
  });
  if (!res.token) throw new ApiError(500, { error: "No session token" });
  return { token: res.token, devVerificationUrl: res.devVerificationUrl };
}

/** YYYY-MM-DD from what was typed (day, month, year), or null when it is not a real date. */
export function isoDate(day: string, month: string, year: string): string | null {
  if (!/^\d{1,2}$/.test(day) || !/^\d{1,2}$/.test(month) || !/^\d{4}$/.test(year)) return null;
  const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const date = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === iso ? iso : null;
}

/**
 * True when a YYYY-MM-DD date is at least 18 years ago — the same check the web form makes before sending, so a minor is
 * told at once; the server checks again and is the one that decides.
 */
export function isAdult(iso: string, today = new Date()): boolean {
  const latest = new Date(Date.UTC(today.getFullYear() - 18, today.getMonth(), today.getDate())).toISOString().slice(0, 10);
  return iso <= latest;
}

/** What a refusal means for the form: words for the fields it concerns, or for the whole form. */
export interface SignUpProblem {
  fields: Partial<Record<SignUpField, string>>;
  form: string | null;
  /** The form token or the challenge must be asked for again before the next try. */
  reopen: boolean;
}

const FIELDS: SignUpField[] = ["email", "username", "displayName", "password", "dateOfBirth", "isAgeVerified", "acceptTerms"];
const FIELD_OF_CODE: Record<string, SignUpField> = {
  UNDERAGE: "dateOfBirth",
  BIRTH_DATE_INVALID: "dateOfBirth",
  USERNAME_RESERVED: "username",
  EMAIL_DOMAIN_REFUSED: "email",
};
const REOPEN = new Set(["FORM_TOKEN_MISSING", "FORM_TOKEN_INVALID", "FORM_TOO_FAST", "FORM_EXPIRED", "BOT_SUSPECTED", "CHALLENGE_FAILED", "CHALLENGE_UNAVAILABLE", "DEVICE_ID_INVALID"]);

/**
 * Maps the server's answer to the form. Validation errors (`details.fieldErrors`, zod) and known codes go on their
 * field, in the app's words (the server's are English and technical); anti-bot refusals, limits and the network go above the button.
 */
export function signUpProblem(error: unknown): SignUpProblem {
  if (!(error instanceof ApiError)) return { fields: {}, form: t("signUp.errors.network"), reopen: false };
  const body = error.body as { code?: unknown; error?: unknown; details?: { fieldErrors?: Record<string, string[] | undefined> } };
  const code = typeof body.code === "string" ? body.code : null;
  const known = (key: string) => t(`signUp.errors.${key}` as MessageKey);
  if (code && FIELD_OF_CODE[code]) return { fields: { [FIELD_OF_CODE[code]]: known(code) }, form: null, reopen: false };
  if (code === "ACCOUNT_EXISTS" || error.status === 409) return { fields: {}, form: known("ACCOUNT_EXISTS"), reopen: true };
  if (code && REOPEN.has(code)) return { fields: {}, form: known(code === "FORM_EXPIRED" ? "FORM_EXPIRED" : code.startsWith("CHALLENGE") ? code : "RETRY"), reopen: true };
  if (code === "AUTOMATION_REFUSED") return { fields: {}, form: known("AUTOMATION_REFUSED"), reopen: false };
  if (error.status === 429) return { fields: {}, form: known("TOO_MANY"), reopen: true };
  const fieldErrors = body.details?.fieldErrors;
  if (error.status === 400 && fieldErrors) {
    const fields: Partial<Record<SignUpField, string>> = {};
    for (const field of FIELDS) {
      const message = fieldErrors[field]?.[0];
      if (message) fields[field] = known(`field_${field}`);
    }
    if (Object.keys(fields).length > 0) return { fields, form: null, reopen: false };
  }
  return { fields: {}, form: typeof body.error === "string" && error.status < 500 ? body.error : known("generic"), reopen: error.status >= 500 };
}
