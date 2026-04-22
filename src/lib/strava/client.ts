import type { StravaActivity } from "@/types";

const STRAVA_API_BASE = "https://www.strava.com/api/v3";
const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";

export interface TokenSet {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // unix seconds
}

function isTokenExpiringSoon(expiresAt: number): boolean {
  return expiresAt < Date.now() / 1000 + 300;
}

export async function refreshStravaToken(refreshToken: string): Promise<TokenSet> {
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    throw new Error(`Strava token refresh failed: ${res.status}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
  };
}

export async function getValidToken(tokens: TokenSet): Promise<TokenSet> {
  if (!isTokenExpiringSoon(tokens.expiresAt)) {
    return tokens;
  }
  return refreshStravaToken(tokens.refreshToken);
}

export async function fetchStravaActivity(
  accessToken: string,
  activityId: number
): Promise<StravaActivity> {
  const res = await fetch(`${STRAVA_API_BASE}/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Strava activity fetch failed: ${res.status}`);
  }

  return res.json() as Promise<StravaActivity>;
}

export async function fetchRecentActivities(
  accessToken: string,
  afterTimestamp: number
): Promise<StravaActivity[]> {
  const url = new URL(`${STRAVA_API_BASE}/athlete/activities`);
  url.searchParams.set("after", String(afterTimestamp));
  url.searchParams.set("per_page", "100");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Strava activities fetch failed: ${res.status}`);
  }

  return res.json() as Promise<StravaActivity[]>;
}
