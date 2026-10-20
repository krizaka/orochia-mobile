import { describe, expect, it } from "@jest/globals";
import { installPluralRules, pluralCategory } from "@/lib/intl-polyfill";

describe("Intl.PluralRules on Hermes (Android has none)", () => {
  it("is installed only where the engine has none", () => {
    expect(installPluralRules({ PluralRules: class {} })).toBe(false);
    const bare: { PluralRules?: unknown } = {};
    expect(installPluralRules(bare)).toBe(true);
    expect(typeof bare.PluralRules).toBe("function");
  });

  it("gives English `one` for exactly 1", () => {
    expect(pluralCategory("en", 1)).toBe("one");
    expect(pluralCategory("en-US", 0)).toBe("other");
    expect(pluralCategory("en", 12)).toBe("other");
  });

  it("gives French `one` for 0 up to 2 (not included)", () => {
    expect(pluralCategory("fr", 0)).toBe("one");
    expect(pluralCategory("fr-CA", 1)).toBe("one");
    expect(pluralCategory("fr", 2)).toBe("other");
  });

  it("serves @krizaka/intl through `new Intl.PluralRules(locale).select(n)`", () => {
    const bare: { PluralRules?: new (l: string) => { select(n: number): string } } = {};
    installPluralRules(bare);
    expect(new bare.PluralRules!("fr").select(1)).toBe("one");
  });
});
