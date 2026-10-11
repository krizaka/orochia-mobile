/**
 * Messages, as the Orochia API answers them (krizaka/orochia apps/web/lib/messaging.ts, docs/NOTIFICATIONS.md §5), and
 * what a live event does to a thread or the list — pure functions, the same rules as the web app's
 * (apps/web/components/messages/chat-state.ts): unique by id and by `clientId` (the stored copy replaces the one shown
 * while sending), ordered by `seq` (messages on their way last).
 */

export type PresenceState = "online" | "away" | "offline";
export interface PresenceView {
  state: PresenceState;
  lastSeenAt: string | null;
}

export interface Conversation {
  id: string;
  lastMessageAt: string;
  otherUser: { id: string; username: string; displayName: string; avatarUrl: string | null };
  lastMessage: { id: string; seq: number; content: string; senderId: string; createdAt: string; deliveredAt: string | null; isRead: boolean } | null;
  unreadCount: number;
  blockedByMe: boolean;
  presence?: PresenceView;
}

export interface ServerMessage {
  id: string;
  seq: number;
  clientId: string | null;
  conversationId: string;
  senderId: string;
  recipientId: string;
  content: string;
  storyId: string | null;
  deliveredAt: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface ChatMessage extends ServerMessage {
  local?: "sending" | "failed";
}

export type Receipt = "sending" | "failed" | "sent" | "delivered" | "read";

export function receiptOf(m: Pick<ChatMessage, "local" | "isRead" | "deliveredAt">): Receipt {
  if (m.local) return m.local;
  if (m.isRead) return "read";
  return m.deliveredAt ? "delivered" : "sent";
}

const LOCAL_SEQ = Number.MAX_SAFE_INTEGER;

export function mergeMessages(current: ChatMessage[], incoming: (ServerMessage | ChatMessage)[]): ChatMessage[] {
  const out: ChatMessage[] = [...current];
  for (const m of incoming as ChatMessage[]) {
    const i = out.findIndex((o) => o.id === m.id || (m.clientId !== null && o.clientId === m.clientId));
    if (i < 0) {
      out.push(m);
      continue;
    }
    const previous = out[i];
    if (!previous.local && m.local) continue;
    out[i] = previous.local || m.local ? m : { ...m, isRead: previous.isRead || m.isRead, deliveredAt: m.deliveredAt ?? previous.deliveredAt, readAt: m.readAt ?? previous.readAt };
  }
  return out.sort((a, b) => {
    const sa = a.local ? LOCAL_SEQ : a.seq;
    const sb = b.local ? LOCAL_SEQ : b.seq;
    return sa !== sb ? sa - sb : a.createdAt.localeCompare(b.createdAt);
  });
}

export function applyReceipt(messages: ChatMessage[], myId: string, receipt: { state: "delivered" | "read"; upTo: number; at: string }): ChatMessage[] {
  let changed = false;
  const next = messages.map((m) => {
    if (m.local || m.senderId !== myId || m.seq > receipt.upTo) return m;
    if (receipt.state === "read" && !m.isRead) {
      changed = true;
      return { ...m, isRead: true, readAt: receipt.at, deliveredAt: m.deliveredAt ?? receipt.at };
    }
    if (receipt.state === "delivered" && !m.deliveredAt) {
      changed = true;
      return { ...m, deliveredAt: receipt.at };
    }
    return m;
  });
  return changed ? next : messages;
}

/** A message in or out: its conversation goes to the top; null when it is not in the list (reload it). */
export function applyMessageToList(list: Conversation[], message: ServerMessage, myId: string, readingNow: boolean): Conversation[] | null {
  const index = list.findIndex((c) => c.id === message.conversationId);
  if (index < 0) return null;
  const c = list[index];
  if (c.lastMessage && c.lastMessage.seq >= message.seq) return list;
  const incoming = message.recipientId === myId;
  const updated: Conversation = {
    ...c,
    lastMessageAt: message.createdAt,
    lastMessage: { id: message.id, seq: message.seq, content: message.content, senderId: message.senderId, createdAt: message.createdAt, deliveredAt: message.deliveredAt, isRead: message.isRead },
    unreadCount: incoming && !readingNow ? c.unreadCount + 1 : c.unreadCount,
  };
  return [updated, ...list.slice(0, index), ...list.slice(index + 1)];
}

export function applyReceiptToList(list: Conversation[], myId: string, r: { conversationId: string; state: "delivered" | "read"; upTo: number; at: string }): Conversation[] {
  return list.map((c) => {
    const last = c.lastMessage;
    if (c.id !== r.conversationId || !last || last.senderId !== myId || last.seq > r.upTo) return c;
    return { ...c, lastMessage: { ...last, deliveredAt: last.deliveredAt ?? r.at, isRead: last.isRead || r.state === "read" } };
  });
}

export function markListRead(list: Conversation[], conversationId: string): Conversation[] {
  return list.map((c) => (c.id === conversationId && c.unreadCount > 0 ? { ...c, unreadCount: 0 } : c));
}

/** A random UUID (v4) for a message's clientId — no native module needed. */
export function uuid(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}
