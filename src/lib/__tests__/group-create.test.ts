import { describe, expect, it } from "@jest/globals";
import { groupBody, groupProblem, MAX_GROUP_MEMBERS, toggleMember } from "@/lib/group-create";

describe("creating a group on the phone (orochia#260: the web's rules, the phone's screen)", () => {
  it("picks and unpicks a contact, keeping the order of the picks", () => {
    expect(toggleMember([], "a")).toEqual(["a"]);
    expect(toggleMember(["a"], "b")).toEqual(["a", "b"]);
    expect(toggleMember(["a", "b"], "a")).toEqual(["b"]);
  });

  it("stops at the server's limit: 49 members besides you (a group holds 50)", () => {
    expect(MAX_GROUP_MEMBERS).toBe(49);
    const full = Array.from({ length: MAX_GROUP_MEMBERS }, (_, i) => `u${i}`);
    expect(toggleMember(full, "one-more")).toEqual(full);
    expect(toggleMember(full, "u0")).toHaveLength(MAX_GROUP_MEMBERS - 1);
  });

  it("needs a name and at least one contact", () => {
    expect(groupProblem({ title: "  ", memberIds: ["a"] })).toBe("title");
    expect(groupProblem({ title: "Crew", memberIds: [] })).toBe("members");
    expect(groupProblem({ title: "x".repeat(201), memberIds: ["a"] })).toBe("titleLong");
    expect(groupProblem({ title: "Crew", memberIds: ["a"] })).toBeNull();
  });

  it("sends the trimmed name and the picked ids, nothing else (the server makes the caller the owner)", () => {
    expect(groupBody({ title: "  Crew  ", memberIds: ["a", "b"] })).toEqual({ title: "Crew", memberIds: ["a", "b"] });
  });
});
