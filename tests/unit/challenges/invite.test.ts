import { describe, it, expect } from "vitest";

/** Minimal invite token shape stored in invites/{inviteToken} */
interface InviteRecord {
  challengeId: string;
  createdBy: string;
  createdAt: string;
  usedBy: string | null;
  usedAt: string | null;
}

function canUseInvite(invite: InviteRecord, uid: string): boolean {
  if (invite.usedBy !== null) return false; // already used
  if (invite.createdBy === uid) return false; // creator cannot use their own invite
  return true;
}

describe("invite token validation", () => {
  const baseInvite: InviteRecord = {
    challengeId: "challenge-123",
    createdBy: "user-creator",
    createdAt: "2025-01-01T00:00:00Z",
    usedBy: null,
    usedAt: null,
  };

  it("allows a valid unused invite for a different user", () => {
    expect(canUseInvite(baseInvite, "user-joiner")).toBe(true);
  });

  it("rejects an already-used invite", () => {
    const used: InviteRecord = { ...baseInvite, usedBy: "user-other", usedAt: "2025-01-02T00:00:00Z" };
    expect(canUseInvite(used, "user-joiner")).toBe(false);
  });

  it("rejects the challenge creator using their own invite", () => {
    expect(canUseInvite(baseInvite, "user-creator")).toBe(false);
  });
});
