import { describe, it, expect } from "vitest";
import type { ChallengeMember } from "@/types";

/** Sort members by total distance descending (primary scoring for distance challenges). */
function rankByDistance(members: ChallengeMember[]): ChallengeMember[] {
  return [...members].sort((a, b) => b.totalDistance - a.totalDistance);
}

describe("challenge scoring — distance ranking", () => {
  const members: ChallengeMember[] = [
    {
      uid: "user-b",
      displayName: "Bob",
      photoURL: null,
      joinedAt: "2025-01-01T00:00:00Z",
      totalDistance: 50000,
      totalDuration: 18000,
      activityCount: 5,
    },
    {
      uid: "user-a",
      displayName: "Alice",
      photoURL: null,
      joinedAt: "2025-01-01T00:00:00Z",
      totalDistance: 75000,
      totalDuration: 27000,
      activityCount: 7,
    },
    {
      uid: "user-c",
      displayName: "Charlie",
      photoURL: null,
      joinedAt: "2025-01-01T00:00:00Z",
      totalDistance: 60000,
      totalDuration: 21600,
      activityCount: 6,
    },
  ];

  it("ranks members by distance descending", () => {
    const ranked = rankByDistance(members);
    expect(ranked[0].uid).toBe("user-a");
    expect(ranked[1].uid).toBe("user-c");
    expect(ranked[2].uid).toBe("user-b");
  });

  it("does not mutate the original array", () => {
    const original = [...members];
    rankByDistance(members);
    expect(members).toEqual(original);
  });

  it("handles a single member", () => {
    const ranked = rankByDistance([members[0]]);
    expect(ranked).toHaveLength(1);
  });

  it("handles an empty leaderboard", () => {
    expect(rankByDistance([])).toEqual([]);
  });
});
