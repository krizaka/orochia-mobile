/** What the server accepts for `POST /api/groups` (apps/web/app/api/groups/route.ts): a name of 1–200 characters and 1–49 contacts. */
export const MAX_GROUP_MEMBERS = 49;
const MAX_TITLE = 200;

export interface GroupDraft {
  title: string;
  memberIds: string[];
}

/** Picks or unpicks a contact; a full group (49) takes no more, but a pick can always be undone. */
export function toggleMember(selected: string[], id: string): string[] {
  if (selected.includes(id)) return selected.filter((x) => x !== id);
  return selected.length >= MAX_GROUP_MEMBERS ? selected : [...selected, id];
}

/** What is missing before the group can be made (the screen says it in words), or null. */
export function groupProblem(draft: GroupDraft): "title" | "titleLong" | "members" | null {
  const title = draft.title.trim();
  if (title.length === 0) return "title";
  if (title.length > MAX_TITLE) return "titleLong";
  if (draft.memberIds.length === 0) return "members";
  return null;
}

export function groupBody(draft: GroupDraft): GroupDraft {
  return { title: draft.title.trim(), memberIds: draft.memberIds };
}
