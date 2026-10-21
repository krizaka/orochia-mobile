// The phone's navigation, by the user's jobs (orochia docs/UX_DECISIONS.md « Phone — the Orochia app »): a tab bar at the
// thumb with five places at most, each an icon AND a word that is never cut, in the web's words, every one a real screen.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { setLocale, t } from "@/i18n";
import { TABS } from "@/lib/tabs";

jest.mock("lucide-react-native", () => new Proxy({}, { get: (_t, name) => () => String(name) }));

const APP = join(__dirname, "..", "app", "(tabs)");

describe("tab bar shape", () => {
  afterEach(() => setLocale("en"));

  it("holds five places at most, the feed first and the account last", () => {
    expect(TABS.length).toBeLessThanOrEqual(5);
    expect(TABS[0].id).toBe("index");
    expect(TABS[TABS.length - 1].id).toBe("me");
  });

  it("every tab is a screen of the app, once", () => {
    expect(new Set(TABS.map((x) => x.id)).size).toBe(TABS.length);
    for (const tab of TABS) expect(existsSync(join(APP, `${tab.id}.tsx`))).toBe(true);
  });

  it("every tab has an icon and a word, short enough not to be cut, in English and in French", () => {
    for (const locale of ["en", "fr"] as const) {
      setLocale(locale);
      for (const tab of TABS) {
        expect(tab.icon).toBeTruthy();
        const word = t(tab.titleKey);
        expect(word.length).toBeGreaterThan(0);
        expect(word.length).toBeLessThanOrEqual(12);
      }
    }
  });

  it("keeps the web's vocabulary for the places the web has", () => {
    setLocale("en");
    const words = TABS.map((x) => t(x.titleKey));
    expect(words).toEqual(expect.arrayContaining(["Home", "Challenges", "Auctions"]));
  });
});
