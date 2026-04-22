import crypto from "crypto";

/**
 * Verifies the X-Hub-Signature header sent by Strava on webhook POSTs.
 * Returns true only if the signature is valid.
 */
export function verifyStravaWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  if (!signatureHeader) return false;

  const secret = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN;
  if (!secret) return false;

  const expected = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex")}`;

  return crypto.timingSafeEqual(
    Buffer.from(signatureHeader),
    Buffer.from(expected)
  );
}
