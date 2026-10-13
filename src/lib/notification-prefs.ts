/**
 * Notification preferences on the phone, by kind rather than by event (30 switches would be read by nobody): each kind
 * turns its events on or off in `profiles.in_app_off` (`PUT /api/me/profile { inAppOff }`) — the "in the app" side,
 * which covers the bell, the toasts and the phone's push (docs/NOTIFICATIONS.md in krizaka/orochia). The web's
 * Settings → Notifications keeps the per-event switches and e-mail; both write the same list.
 *
 * The events are those of apps/web/lib/profile.ts `NOTIFICATION_EVENTS` (krizaka/orochia) — a test counts them.
 */
export const NOTIFICATION_GROUPS = {
  messages: ["newMessage"],
  people: ["newFollower", "contactRequest"],
  comments: ["newComment", "commentReply"],
  earnings: ["tipReceived", "videoUnlocked"],
  videos: ["videoReady", "creatorPublished"],
  auctions: ["auctionAnnounced", "auctionNewBid", "auctionOutbid", "auctionWon", "auctionDecision", "auctionSold", "auctionUnsold", "auctionDeclined"],
  challenges: [
    "challengeAnnounced",
    "challengeRequested",
    "challengePledged",
    "challengeFunded",
    "challengeAccepted",
    "challengeApplied",
    "challengeChosen",
    "challengeDelivered",
    "challengeReleased",
    "challengeClosed",
  ],
  storage: ["storageLow", "storageHeld", "storageAlert"],
} as const;

export type NotificationGroup = keyof typeof NOTIFICATION_GROUPS;
export const GROUPS = Object.keys(NOTIFICATION_GROUPS) as NotificationGroup[];

/** A kind is on while none of its events is turned off (an event turned off on the web turns the kind off here). */
export function groupOn(off: readonly string[], group: NotificationGroup): boolean {
  return !NOTIFICATION_GROUPS[group].some((event) => off.includes(event));
}

/** The "off" list with a kind turned on or off; the other events keep their state. Sorted, without duplicates. */
export function setGroup(off: readonly string[], group: NotificationGroup, on: boolean): string[] {
  const events = new Set<string>(NOTIFICATION_GROUPS[group]);
  const rest = off.filter((event) => !events.has(event));
  return [...new Set(on ? rest : [...rest, ...events])].sort();
}
