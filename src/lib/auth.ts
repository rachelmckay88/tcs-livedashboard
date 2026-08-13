/**
 * Minimal admin authentication.
 *
 * SCOPE: deliberately not a user system. There is one shared password in
 * ADMIN_PASSWORD, and a signed cookie proving it was entered. That is the
 * right weight for an internal tool used by one or two people each morning.
 *
 * The warehouse display at "/" is intentionally public — the TV cannot be
 * asked to log in every morning, and the data is not sensitive.
 *
 * The cookie holds no secret: it is `expiry.HMAC(secret, expiry)`. Without
 * ADMIN_SESSION_SECRET nobody can forge one, and the expiry cannot be edited
 * because it is covered by the signature.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE_NAME = "tcs_admin";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "ADMIN_SESSION_SECRET is missing or too short. Set it in .env — generate one with `openssl rand -base64 32`.",
    );
  }
  return secret;
}

/** Constant-time string comparison that tolerates differing lengths. */
function safeEquals(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, "utf8");
  const bufferB = Buffer.from(b, "utf8");
  if (bufferA.length !== bufferB.length) {
    // Still burn a comparison so length alone is not a timing signal.
    timingSafeEqual(bufferA, bufferA);
    return false;
  }
  return timingSafeEqual(bufferA, bufferB);
}

function sign(value: string): string {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
}

/** Is the supplied password the configured admin password? */
export function isValidPassword(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    throw new Error("ADMIN_PASSWORD is not set. Add it to .env before using /admin.");
  }
  return safeEquals(candidate, expected);
}

/** Build a signed session token that expires 30 days from now. */
export function createSessionToken(): string {
  const expiry = String(Date.now() + SESSION_DURATION_MS);
  return `${expiry}.${sign(expiry)}`;
}

/** Verify a token's signature and expiry. */
export function isValidSessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const [expiry, signature] = token.split(".");
  if (!expiry || !signature) return false;
  if (!safeEquals(signature, sign(expiry))) return false;
  const expiresAt = Number(expiry);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

/** Cookie options shared by login and logout. */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION_MS / 1000,
  };
}

/** Server-side check used by /admin and the write API routes. */
export async function isAdminAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return isValidSessionToken(store.get(ADMIN_COOKIE_NAME)?.value);
}
