import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Integration test for the Strava webhook handler.
 * The handler is tested in isolation — Firestore and Strava API calls are mocked.
 *
 * TODO(agent): Wire up the actual route handler once src/app/api/strava/webhook/route.ts exists.
 */
describe("POST /api/strava/webhook", () => {
  beforeEach(() => {
    vi.stubEnv("STRAVA_WEBHOOK_VERIFY_TOKEN", "test-secret");
  });

  it.todo("creates an activity document and updates member totals in a transaction");
  it.todo("returns 200 for a valid activity:create event");
  it.todo("returns 401 for a request with an invalid signature");
  it.todo("skips events with object_type != activity");
  it.todo("handles delete events by removing the activity document");
});
