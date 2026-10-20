import { randomBytes, randomUUID, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { validNewPassword } from "./auth-inputs";
import {
  createSession,
  deleteSessionByTokenHash,
  findSessionByTokenHash,
  consumeRateLimit,
  recordAuditEvent,
  type SessionWithUser,
} from "./auth-db";

export const SESSION_COOKIE = "norte360_session";
const SESSION_DAYS = 30;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function validatePassword(password: string) {
  return validNewPassword(password);
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function hashRequestValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function getRequestFingerprints(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwardedFor || request.headers.get("x-real-ip") || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";

  return {
    ipHash: hashRequestValue(ip),
    userAgentHash: hashRequestValue(userAgent),
  };
}

export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) {
    return true;
  }

  return origin === new URL(request.url).origin;
}

export async function checkAuthRateLimit(action: string, request: Request, email?: string) {
  const { ipHash } = getRequestFingerprints(request);
  const normalizedEmail = email ? normalizeEmail(email) : "anonymous";
  const keyHash = hashRequestValue(`${action}:${ipHash}:${normalizedEmail}`);

  return consumeRateLimit({
    keyHash,
    limit: action === "login" ? 8 : 5,
    windowSeconds: 15 * 60,
  });
}

export async function auditAuthEvent(
  request: Request,
  eventType: string,
  options: { userId?: string | null; metadata?: Record<string, unknown> } = {},
) {
  const { ipHash, userAgentHash } = getRequestFingerprints(request);
  await recordAuditEvent({
    id: randomUUID(),
    userId: options.userId,
    eventType,
    ipHash,
    userAgentHash,
    metadata: options.metadata,
  });
}

export async function issueSessionCookie(userId: string, request?: Request) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const fingerprints: { ipHash?: string; userAgentHash?: string } = request ? getRequestFingerprints(request) : {};

  await createSession({
    id: randomUUID(),
    userId,
    tokenHash,
    expiresAt,
    ipHash: fingerprints.ipHash,
    userAgentHash: fingerprints.userAgentHash,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function getCurrentSession(): Promise<SessionWithUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  try {
    return await findSessionByTokenHash(hashSessionToken(token));
  } catch {
    return null;
  }
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    try {
      await deleteSessionByTokenHash(hashSessionToken(token));
    } catch {
      // Clearing the browser cookie still signs out the current device.
    }
  }

  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}
