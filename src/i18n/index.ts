import en from "./en.json";

/**
 * Every user-facing string lives in en.json (the reference, as in the web app); keys are typed from it, so a missing or
 * misspelt key fails to compile. Variables: t("wallet.balance", { amount: "$10.00" }) fills {amount}.
 */
type Leaves<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

export type MessageKey = Leaves<typeof en>;

export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  const value = key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], en);
  const text = typeof value === "string" ? value : key;
  return vars ? text.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`)) : text;
}

const usdFormat = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
/** $1,234.50 */
export const usd = (cents: number) => usdFormat.format(cents / 100);
const compactFormat = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
/** 12.3K */
export const compact = (n: number) => compactFormat.format(n);
