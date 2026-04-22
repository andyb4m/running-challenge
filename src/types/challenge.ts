export type SportType =
  | "Run"
  | "Ride"
  | "Swim"
  | "Walk"
  | "Hike"
  | "WeightTraining"
  | "Yoga"
  | "Other";

export type ChallengeGoalUnit = "distance_km" | "distance_miles" | "duration_minutes" | "count";

export interface ChallengeGoal {
  value: number;
  unit: ChallengeGoalUnit;
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  sportType: SportType;
  goal: ChallengeGoal;
  startDate: string; // ISO 8601 date string (YYYY-MM-DD)
  endDate: string;   // ISO 8601 date string (YYYY-MM-DD)
  createdBy: string; // uid
  createdAt: string; // ISO 8601
  inviteToken: string;
  memberCount: number;
}

export interface ChallengeMember {
  uid: string;
  displayName: string;
  photoURL: string | null;
  joinedAt: string; // ISO 8601
  totalDistance: number; // metres
  totalDuration: number; // seconds
  activityCount: number;
}

export interface CreateChallengeInput {
  name: string;
  description: string;
  sportType: SportType;
  goal: ChallengeGoal;
  startDate: string;
  endDate: string;
}
