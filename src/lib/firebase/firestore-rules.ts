/**
 * Firestore security rules are defined in firestore.rules at the repo root.
 * This file documents the collection paths used by the app.
 *
 * Collections:
 *   users/{uid}
 *   challenges/{challengeId}
 *   challenges/{challengeId}/members/{uid}
 *   challenges/{challengeId}/activities/{activityId}
 *   invites/{inviteToken}
 */
export const COLLECTIONS = {
  users: "users",
  challenges: "challenges",
  members: (challengeId: string) => `challenges/${challengeId}/members`,
  activities: (challengeId: string) => `challenges/${challengeId}/activities`,
  invites: "invites",
} as const;
