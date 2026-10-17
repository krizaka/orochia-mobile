import { describe, expect, it } from "@jest/globals";
import { applyMessageToList, applyReceipt, type ChatMessage, type Conversation, markListRead, mergeMessages, receiptOf, uuid } from "@/lib/chat";

const me = "me";
const msg = (seq: number, extra: Partial<ChatMessage> = {}): ChatMessage => ({
  id: `m${seq}`,
  seq,
  clientId: null,
  conversationId: "c1",
  senderId: me,
  recipientId: "you",
  content: `#${seq}`,
  storyId: null,
  deliveredAt: null,
  isRead: false,
  readAt: null,
  createdAt: new Date(1_700_000_000_000 + seq * 1000).toISOString(),
  ...extra,
});

describe("a conversation on the phone", () => {
  it("keeps one copy per message, in seq order, whatever the arrival order (replay + live)", () => {
    expect(mergeMessages([msg(2)], [msg(3), msg(1), msg(2)]).map((m) => m.seq)).toEqual([1, 2, 3]);
  });

  it("the stored message replaces the one shown while sending, and a late echo never brings it back", () => {
    const local = msg(0, { id: "local-x", clientId: "x", local: "sending" });
    const merged = mergeMessages([msg(5), local], [msg(7, { clientId: "x" })]);
    expect(merged.map((m) => m.id)).toEqual(["m5", "m7"]);
    expect(mergeMessages(merged, [local]).map((m) => m.id)).toEqual(["m5", "m7"]);
  });

  it("delivered then read, for the sender's messages up to the cursor", () => {
    const thread = [msg(1), msg(2), msg(3, { senderId: "you", recipientId: me })];
    const read = applyReceipt(applyReceipt(thread, me, { state: "delivered", upTo: 1, at: "t" }), me, { state: "read", upTo: 2, at: "t" });
    expect(read.map(receiptOf)).toEqual(["read", "read", "sent"]);
  });

  it("the list moves the conversation up and counts what is not being read", () => {
    const conv = (id: string, unread = 0): Conversation => ({ id, kind: "direct", title: null, memberCount: 2, muted: false, lastMessageAt: "", otherUser: { id: "you", username: "you", displayName: "You", avatarUrl: null }, lastMessage: null, unreadCount: unread, blockedByMe: false });
    const next = applyMessageToList([conv("a"), conv("c1")], msg(4, { senderId: "you", recipientId: me }), me, false)!;
    expect(next.map((c) => c.id)).toEqual(["c1", "a"]);
    expect(next[0].unreadCount).toBe(1);
    expect(markListRead(next, "c1")[0].unreadCount).toBe(0);
    expect(applyMessageToList([conv("a")], msg(1), me, false)).toBeNull();
  });

  it("a group message (no recipient) from someone else is unread, one's own is not", () => {
    const group: Conversation = { id: "c1", kind: "group", title: "Crew", memberCount: 3, muted: false, lastMessageAt: "", otherUser: { id: "c1", username: "", displayName: "Crew", avatarUrl: null }, lastMessage: null, unreadCount: 0, blockedByMe: false };
    expect(applyMessageToList([group], msg(4, { senderId: "you", recipientId: null }), me, false)![0].unreadCount).toBe(1);
    expect(applyMessageToList([group], msg(5, { senderId: me, recipientId: null }), me, false)![0].unreadCount).toBe(0);
  });

  it("makes client ids that look like UUIDs", () => {
    expect(uuid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
