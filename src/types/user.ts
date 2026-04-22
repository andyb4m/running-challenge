export interface StravaConnection {
  athleteId: number;
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // unix timestamp (seconds)
  connectedAt: string; // ISO 8601
}

export interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  createdAt: string; // ISO 8601
  strava: StravaConnection | null;
}
