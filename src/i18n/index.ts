import { createI18n, type MessageKey as KeyOf, type Translate } from "@krizaka/i18n";

import en from "./en.json";
import fr from "./fr.json";

/**
 * Every user-facing string lives in src/i18n/<locale>.json — English (en.json) is the reference, French a language of
 * design (Orochia is made in Montréal; Québec's Charter of the French language). Keys are typed from en.json, and fr.json is
 * typed against it: a key missing from French fails to compile. `krizaka-i18n check` (npm run lint) checks the rest.
 * The engine (lookup, fallback, plurals) is @krizaka/i18n, shared with the web app and every Krizaka app.
 * Variables: t("wallet.balance", { amount: "$10.00" }); a count is a plural set: t("video.views", { count, shown }).
 */
export type Locale = "en" | "fr";
export type Messages = typeof en;
export type MessageKey = KeyOf<Messages>;

const french: Messages = fr;
export const i18n = createI18n<Messages, Locale>({ en, fr: french }, { defaultLocale: "en" });

/** The phone's language: French (fr, fr-CA…) for a French phone, English for every other. */
export function deviceLocale(tag = Intl.DateTimeFormat().resolvedOptions().locale): Locale {
  return /^fr(-|_|$)/i.test(tag) ? "fr" : "en";
}

let current: Locale = deviceLocale();

/** The language the app speaks now. It is the phone's; tests (and a future in-app switch) set it. */
export const locale = (): Locale => current;
export const setLocale = (next: Locale): void => {
  current = next;
};

/** Reads a message in the app's language. */
export const t: Translate<Messages> = ((key: string, values?: Record<string, string | number>) =>
  (i18n.translator(current) as (key: string, values?: Record<string, string | number>) => string)(key, values)) as Translate<Messages>;

/** The Intl locale of the app's language (`fr-CA` for Québec French, `en-US` otherwise). */
export const intlLocale = (): string => (current === "fr" ? "fr-CA" : "en-US");

/** `Accept-Language` for the API: the server writes its messages, e-mails and push in this language. */
export const acceptLanguage = (): string => (current === "fr" ? "fr-CA, fr;q=0.9, en;q=0.5" : "en-US, en;q=0.9");

/** $1,234.50 · 1 234,50 $ US */
export const usd = (cents: number) => new Intl.NumberFormat(intlLocale(), { style: "currency", currency: "USD" }).format(cents / 100);
/** 12.3K · 12,3 k */
export const compact = (n: number) => new Intl.NumberFormat(intlLocale(), { notation: "compact", maximumFractionDigits: 1 }).format(n);
