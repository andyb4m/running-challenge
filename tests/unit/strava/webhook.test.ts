import { describe, it, expect, beforeEach, vi } from "vitest";
import { verifyStravaWebhookSignature } from "@/lib/strava/webhook";
import crypto from "crypto";

const VERIFY_TOKEN = "test-webhook-verify-token";

beforeEach(() => {
  vi.stubEnv("STRAVA_WEBHOOK_VERIFY_TOKEN", VERIFY_TOKEN);
});

function makeSignature(body: string): string {
  return `sha256=${crypto
    .createHmac("sha256", VERIFY_TOKEN)
    .update(body)
    .digest("hex")}`;
}

describe("verifyStravaWebhookSignature", () => {
  it("returns true for a valid signature", () => {
    const body = JSON.stringify({ object_type: "activity", object_id: 123 });
    expect(verifyStravaWebhookSignature(body, makeSignature(body))).toBe(true);
  });

  it("returns false when signature header is null", () => {
    expect(verifyStravaWebhookSignature("{}", null)).toBe(false);
  });

  it("returns false for a tampered body", () => {
    const body = '{"object_id":123}';
    const tamperedBody = '{"object_id":999}';
    expect(verifyStravaWebhookSignature(tamperedBody, makeSignature(body))).toBe(false);
  });

  it("returns false when STRAVA_WEBHOOK_VERIFY_TOKEN is not set", () => {
    vi.stubEnv("STRAVA_WEBHOOK_VERIFY_TOKEN", "");
    expect(verifyStravaWebhookSignature("{}", makeSignature("{}"))).toBe(false);
  });
});
