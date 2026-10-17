import { afterEach, describe, expect, it } from "@jest/globals";
import en from "@/i18n/en.json";
import fr from "@/i18n/fr.json";
import { acceptLanguage, compact, deviceLocale, intlLocale, locale, setLocale, t, usd } from "@/i18n";
import { absoluteUrl } from "@/lib/config";

type Tree = { [key: string]: Tree | string };
const leaves = (tree: Tree | string, path = ""): [string, string][] =>
  typeof tree === "string" ? [[path, tree]] : Object.entries(tree).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));

afterEach(() => setLocale("en"));

describe("words and URLs", () => {
  it("fills variables and formats money", () => {
    expect(t("challenge.backers", { count: 3 })).toBe("Backers · 3");
    expect(usd(1250)).toBe("$12.50");
  });

  it("answers the key itself for a missing message instead of crashing", () => {
    expect((t as unknown as (key: string) => string)("nope.missing")).toBe("nope.missing");
  });

  it("puts relative media on the Orochia host and keeps absolute ones", () => {
    expect(absoluteUrl("/defaults/avatars/avatar-01.svg")).toMatch(/^https?:\/\/[^/]+\/defaults\/avatars\/avatar-01\.svg$/);
    expect(absoluteUrl("https://cdn.example.com/a.jpg")).toBe("https://cdn.example.com/a.jpg");
    expect(absoluteUrl(null)).toBeNull();
  });
});

describe("the app speaks the phone's language", () => {
  it("is French for a French phone (fr, fr-CA, fr_FR) and English for everything else", () => {
    expect(deviceLocale("fr-CA")).toBe("fr");
    expect(deviceLocale("fr")).toBe("fr");
    expect(deviceLocale("fr_FR")).toBe("fr");
    expect(deviceLocale("en-US")).toBe("en");
    expect(deviceLocale("de-DE")).toBe("en");
    expect(deviceLocale("frisian")).toBe("en");
  });

  it("reads messages, money and counts in French", () => {
    setLocale("fr");
    expect(locale()).toBe("fr");
    expect(t("tabs.home")).toBe("Accueil");
    expect(t("challenge.backers", { count: 3 })).toBe("Contributeurs · 3");
    expect(usd(123450).replace(/\s/g, " ")).toMatch(/^1 234,50 \$/);
    expect(compact(12345).replace(/\s/g, " ")).toMatch(/^12,3 k/i);
    expect([0, 1, 2].map((count) => t("video.views", { count, shown: String(count) }))).toEqual(["0 vue", "1 vue", "2 vues"]);
    expect(t("messages.unread", { count: 1 })).toBe("1 non lu");
  });

  it("tells the API which language to write in", () => {
    expect(acceptLanguage()).toMatch(/^en-US/);
    setLocale("fr");
    expect(acceptLanguage()).toMatch(/^fr-CA/);
    expect(intlLocale()).toBe("fr-CA");
  });
});

describe("the French catalogue", () => {
  const frLeaves = new Map(leaves(fr as Tree));

  it("has every key of the English one, only those, with the same placeholders", () => {
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
    const enLeaves = leaves(en as Tree);
    expect([...frLeaves.keys()].sort()).toEqual(enLeaves.map(([k]) => k).sort());
    expect(enLeaves.filter(([key, text]) => ph(frLeaves.get(key) ?? "").join() !== ph(text).join()).map(([key]) => key)).toEqual([]);
  });

  it("is translated and speaks the family's Québec French", () => {
    const words = (s: string) => s.replace(/\{\w+\}/g, " ");
    const english = /(?<![\p{L}])(the|your|you|with|from|this|that|and)(?![\p{L}])/iu;
    const casual = /(?<![\p{L}])(tu|ton|ta|tes|toi)(?![\p{L}])/iu;
    const anglicism = /e-?mail|hashtag|\bupload|\btips?\b|\bfollowers?\b|\bwallet\b|\bpledges?\b/i;
    const offenders = [...frLeaves].filter(([, text]) => english.test(words(text)) || casual.test(words(text)) || anglicism.test(words(text))).map(([key]) => key);
    expect(offenders).toEqual([]);
  });
});
