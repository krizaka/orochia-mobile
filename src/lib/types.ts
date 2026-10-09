/** The shapes the Orochia API answers (apps/web/lib/*.ts in krizaka/orochia) — only what the app reads. */

export type Role = "ADMIN" | "CREATOR" | "MEMBER";

export interface SessionUser {
  id: string;
  username: string;
  email: string;
  role: Role;
  displayName?: string | null;
  avatarUrl?: string | null;
}

export interface VideoSummary {
  id: string;
  title: string;
  creatorName: string;
  creatorUsername: string;
  creatorAvatar: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number;
  visibility: string;
  minTipAmountCents: number;
  viewsCount: number;
  likesCount: number;
}

export interface VideoDetails extends VideoSummary {
  description: string | null;
  moreFromCreator: VideoSummary[];
}

export type StreamAccess =
  | { allowed: true; streamUrl: string; title: string }
  | { allowed: false; reason: string; minTipAmountCents?: number; videoTitle?: string };

export interface StoryItem {
  id: string;
  type: "image" | "video";
  url: string;
  thumbnailUrl: string | null;
  caption: string;
  durationSeconds: number;
  seen: boolean;
}

export interface StoryRing {
  creatorId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isOwn: boolean;
  allSeen: boolean;
  stories: StoryItem[];
}

export interface Person {
  username: string;
  name: string;
  avatarUrl: string | null;
}

export type ChallengeStage =
  | "FUNDING"
  | "GOAL_REACHED"
  | "AWAITING_ANSWER"
  | "CASTING"
  | "CLOSING"
  | "IN_PROGRESS"
  | "DELIVERED"
  | "DECLINED"
  | "EXPIRED"
  | "FAILED"
  | "CANCELLED";

export interface ChallengeCard {
  id: string;
  kind: "GOAL" | "REQUEST" | "OPEN_CALL";
  stage: ChallengeStage;
  deliverable: "VIDEO" | "STORY";
  reward: "BACKERS" | "EVERYONE";
  title: string;
  goalCents: number | null;
  pledgedCents: number;
  backersCount: number;
  progress: number | null;
  deadline: string;
  deliveryDeadline: string | null;
  creator: Person | null;
  applicationsCount: number;
}

export interface ChallengeView extends ChallengeCard {
  description: string;
  deliveryDays: number;
  serverNow: string;
  recentPledges: { id: string; alias: number; amountCents: number; mine: boolean }[];
  topBackers: { alias: number; totalCents: number; mine: boolean }[];
  delivered: { videoId: string | null; storyId: string | null; canWatch: boolean } | null;
  suggestedPledgesCents: number[];
  minimumPledgeCents: number;
  viewer: { signedIn: boolean; isCreator: boolean; pledgedCents: number; balanceCents: number | null; canPledge: boolean };
}

export interface AuctionCard {
  id: string;
  phase: string;
  rights: "WATCH" | "DOWNLOAD";
  highestBidCents: number;
  startingPriceCents: number;
  bidsCount: number;
  startsAt: string;
  endsAt: string;
  videoId: string;
  title: string;
  thumbnailUrl: string | null;
  creatorName: string;
  creatorAvatar: string | null;
}

export interface AuctionView {
  id: string;
  status: string;
  phase: string;
  rights: "WATCH" | "DOWNLOAD";
  highestBidCents: number;
  bidsCount: number;
  minimumNextBidCents: number;
  suggestedBidsCents: number[];
  endsAt: string;
  serverNow: string;
  video: { id: string; title: string; thumbnailUrl: string | null };
  creator: Person;
  recentBids: { id: string; amountCents: number; alias: number; mine: boolean }[];
  viewer: { signedIn: boolean; isCreator: boolean; isLeader: boolean; won: boolean; balanceCents: number | null };
}

export interface Wallet {
  balanceCents: number;
  heldCents: number;
  history: { id: string; type: string; amountCents: number; createdAt: string; note: string | null }[];
}

export interface NotificationItem {
  id: string;
  event: string;
  text: string;
  path: string;
  createdAt: string;
  readAt: string | null;
}
