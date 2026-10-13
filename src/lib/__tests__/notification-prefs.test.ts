import { describe, expect, it } from "@jest/globals";
import { groupOn, NOTIFICATION_GROUPS, setGroup } from "@/lib/notification-prefs";

describe("notification preferences, by kind", () => {
  it("covers every event the server sends, each in exactly one group", () => {
    const all = Object.values(NOTIFICATION_GROUPS).flat();
    expect(new Set(all).size).toBe(all.length);
    // apps/web/lib/profile.ts NOTIFICATION_EVENTS (krizaka/orochia)
    expect(all).toHaveLength(30);
    expect(all).toEqual(expect.arrayContaining(["newMessage", "tipReceived", "auctionOutbid", "challengeFunded", "storageAlert"]));
  });

  it("a kind is on unless its events are off", () => {
    expect(groupOn([], "auctions")).toBe(true);
    expect(groupOn([...NOTIFICATION_GROUPS.auctions], "auctions")).toBe(false);
    // Turned off one by one on the web: the kind reads as off as soon as one of its events is.
    expect(groupOn(["auctionOutbid"], "auctions")).toBe(false);
  });

  it("turning a kind off or on changes its events only, and keeps the rest of the list", () => {
    const off = setGroup(["newComment"], "messages", false);
    expect(off).toEqual(["newComment", "newMessage"]);
    expect(setGroup(off, "messages", true)).toEqual(["newComment"]);
    expect(setGroup(["auctionOutbid", "newComment"], "auctions", true)).toEqual(["newComment"]);
  });
});
