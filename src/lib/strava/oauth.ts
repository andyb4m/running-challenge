const STRAVA_AUTHORIZE_URL = "https://www.strava.com/oauth/authorize";
const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";

export function buildStravaAuthUrl(uid: string): string {
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID ?? "",
    redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/strava/callback`,
    response_type: "code",
    scope: "activity:read_all",
    state: uid,
  });
  return `${STRAVA_AUTHORIZE_URL}?${params.toString()}`;
}

export interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete: {
    id: number;
    firstname: string;
    lastname: string;
    profile: string;
  };
}

export async function exchangeCodeForTokens(
  code: string
): Promise<StravaTokenResponse> {
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    throw new Error(`Strava token exchange failed: ${res.status}`);
  }

  return res.json() as Promise<StravaTokenResponse>;
}
