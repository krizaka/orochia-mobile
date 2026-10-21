import { Flame, Gavel, House, MessageCircle, UserRound } from "lucide-react-native";
import type { MessageKey } from "@/i18n";

/**
 * The tab bar, as data (orochia docs/UX_DECISIONS.md « Phone — the Orochia app »): the places a person goes to, at the
 * thumb, each an icon and a word. `id` is the screen's file in `src/app/(tabs)`. `src/__tests__/nav-shape.test.ts` keeps
 * its shape (five at most, every one a screen, words short enough not to be cut in either language).
 */
export const TABS = [
  { id: "index", titleKey: "tabs.home", icon: House },
  { id: "challenges", titleKey: "tabs.challenges", icon: Flame },
  { id: "auctions", titleKey: "tabs.auctions", icon: Gavel },
  { id: "messages", titleKey: "tabs.messages", icon: MessageCircle },
  { id: "me", titleKey: "tabs.me", icon: UserRound },
] as const satisfies readonly { id: string; titleKey: MessageKey; icon: unknown }[];
