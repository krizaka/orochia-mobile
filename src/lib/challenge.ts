import type { ChallengeCard } from "./types";

/** The stages whose deadline is running: the pot is still open (funding, answering, casting). */
export const TICKING: ReadonlySet<string> = new Set(["FUNDING", "GOAL_REACHED", "AWAITING_ANSWER", "CASTING"]);

/** How full the pot's ring is (0–1): the server's progress, or $100 as the yardstick of an open-ended pot. */
export const challengeRatio = (ch: Pick<ChallengeCard, "progress" | "pledgedCents">) => ch.progress ?? Math.min(1, ch.pledgedCents / 100_00);
