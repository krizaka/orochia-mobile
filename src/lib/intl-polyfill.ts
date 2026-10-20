/**
 * Hermes on Android ships no `Intl.PluralRules`: `new Intl.PluralRules(…)` is `undefined cannot be used as a constructor`,
 * which @krizaka/intl (plural messages such as « 1 view / 12 views ») calls on every video tile — the Home tab crashed
 * on the Android build (EAS preview, 2026-10-20). The app speaks two languages, so the two rules it needs are enough:
 * English (`one` for exactly 1) and French (`one` for 0 up to, not including, 2). Only installed when the engine has none.
 */
type Category = "zero" | "one" | "two" | "few" | "many" | "other";

export function pluralCategory(locale: string, n: number): Category {
  if (/^fr(-|_|$)/i.test(locale)) return n >= 0 && n < 2 ? "one" : "other";
  return n === 1 ? "one" : "other";
}

class PluralRulesFallback {
  constructor(private readonly locale: string | string[] = "en") {}
  select(n: number): Category {
    return pluralCategory(Array.isArray(this.locale) ? (this.locale[0] ?? "en") : this.locale, n);
  }
  resolvedOptions() {
    return { locale: Array.isArray(this.locale) ? (this.locale[0] ?? "en") : this.locale, type: "cardinal" as const };
  }
  static supportedLocalesOf(locales: string | string[]) {
    return Array.isArray(locales) ? locales : [locales];
  }
}

export function installPluralRules(target: { PluralRules?: unknown } = Intl as { PluralRules?: unknown }): boolean {
  if (typeof target.PluralRules === "function") return false;
  target.PluralRules = PluralRulesFallback;
  return true;
}

installPluralRules();
