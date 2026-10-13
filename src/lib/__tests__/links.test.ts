import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { openPath } from "@/lib/links";
import { OROCHIA_URL } from "@/lib/config";

const pushed: string[] = [];
const browsed: string[] = [];
jest.mock("expo-router", () => ({ router: { push: (path: string) => pushed.push(path) } }));
jest.mock("expo-web-browser", () => ({ openBrowserAsync: async (url: string) => void browsed.push(url) }));


const ID = "0b9c1f2e-1111-4111-8111-111111111111";

beforeEach(() => {
  pushed.length = 0;
  browsed.length = 0;
});

describe("a notification's path opens the right screen", () => {
  it.each([
    [`/messages?c=${ID}`, `/messages/${ID}`],
    ["/messages", "/messages"],
    [`/auctions/${ID}`, `/auctions/${ID}`],
    [`/challenges/${ID}`, `/challenges/${ID}`],
    [`/watch/${ID}#comments-title`, `/watch/${ID}`],
    ["/challenges?tab=inbox", "/challenges"],
    ["/auctions?tab=open", "/auctions"],
  ])("%s → %s (native)", (path, screen) => {
    openPath(path);
    expect(pushed).toEqual([screen]);
    expect(browsed).toEqual([]);
  });

  it("anything the app has no screen for opens on orochia.com", () => {
    openPath("/dashboard?tab=earnings");
    expect(pushed).toEqual([]);
    expect(browsed).toEqual([`${OROCHIA_URL}/dashboard?tab=earnings`]);
  });
});
